import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertCareRequestSchema, CareRequest } from "@shared/schema";

// Simple NLP for request categorization
function analyzeRequest(requestText: string): { summary: string, details: string[] } {
  // Very simple analysis, in a real app this would use a more robust NLP service
  const keywords = {
    medication: ["medication", "pills", "medicine", "prescription", "reminder"],
    companionship: ["companion", "company", "visit", "chat", "talk", "conversation"],
    urgent: ["urgent", "emergency", "immediately", "asap", "right now"],
    checkIn: ["check", "check-in", "call", "checking"]
  };

  const details: string[] = [];
  const requestLower = requestText.toLowerCase();

  // Check for services mentioned
  for (const [category, terms] of Object.entries(keywords)) {
    if (terms.some(term => requestLower.includes(term))) {
      switch(category) {
        case "medication":
          details.push("Medication reminder assistance");
          break;
        case "companionship":
          details.push("Companionship service");
          break;
        case "urgent":
          details.push("Urgent physical assistance");
          break;
        case "checkIn":
          details.push("Check-in call service");
          break;
      }
    }
  }

  // Look for duration
  const durationMatch = requestLower.match(/(\d+)\s*(hour|hr|hours)/);
  if (durationMatch) {
    details.push(`${durationMatch[1]} hours of assistance`);
  }

  // Generate simple summary
  let summary = requestText;
  if (summary.length > 100) {
    summary = summary.slice(0, 97) + "...";
  }

  return { summary, details };
}





export async function registerRoutes(app: Express): Promise<Server> {
  // sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Test endpoint - can be removed later
  app.get('/api/test', (req, res) => {
      res.json({ 
        message: 'You are authenticated', 
        user: req.user,
        session: req.session
      });
  });

  // Testing endpoint to create a test user - remove in production
  app.get('/api/create-test-user', async (req, res) => {
    try {
      // Check if test user already exists
      const existingUser = await storage.getUserByUsername('testuser');
      if (existingUser) {
        return res.json({ 
          message: 'Test user already exists',
          userId: existingUser.id,
          username: existingUser.username
        });
      }

      // Create a new test user with CARE_SEEKER role
      // Import the hashPassword function
      const { hashPassword } = require('./auth');
      const hashedPassword = await hashPassword('password123');

      const user = await storage.createUser({
        username: 'testuser',
        password: hashedPassword,
        email: 'test@example.com',
        fullName: 'Test User',
        userType: 'CARE_SEEKER',
        phoneNumber: '555-1234'
      });

      // Strip password from response
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        message: 'Test user created successfully',
        user: userWithoutPassword
      });
    } catch (error) {
      console.error('Error creating test user:', error);
      res.status(500).json({ 
        message: 'Error creating test user',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // Set up WebSocket server for real-time communication
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws'
  });

  // Store connected clients for broadcasting updates
  const clients = new Map<number, WebSocket>();

  wss.on('connection', (ws, req) => {
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        // Handle different message types
        if (data.type === 'provider-location-update' && data.userId) {
          // Update provider location
          const { userId, latitude, longitude } = data;
          await storage.updateProviderStatus(userId, { latitude, longitude });

          // Broadcast to relevant clients
          if (data.requestId) {
            // Find the seeker for this request
            const request = await storage.getCareRequest(data.requestId);
            if (request && request.userSeekerId) {
              const seekerWs = clients.get(request.userSeekerId);
              if (seekerWs && seekerWs.readyState === WebSocket.OPEN) {
                seekerWs.send(JSON.stringify({
                  type: 'caregiver-location',
                  providerId: userId,
                  latitude,
                  longitude
                }));
              }
            }
          }
        } else if (data.type === 'provider-status-update' && data.userId) {
          // Update provider online status
          await storage.updateProviderStatus(data.userId, { 
            isOnline: data.isOnline,
            latitude: data.latitude,
            longitude: data.longitude 
          });
        } else if (data.type === 'register-client' && data.userId) {
          // Register client for future communication
          clients.set(data.userId, ws);
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      // Remove client from Map when disconnected
      Array.from(clients.entries()).forEach(([userId, client]) => {
        if (client === ws) {
          clients.delete(userId);
        }
      });
    });
  });

  // API routes
  // Care request endpoints
  app.post('/api/care-requests', async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validationResult = insertCareRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ errors: validationResult.error.errors });
      }
  
      // If no user is authenticated, fall back to the test user
      let userId = req.user?.id;
  
      if (!userId) {
        const guestUser = await storage.getUserByUsername('testuser');
        if (!guestUser) {
          return res.status(403).json({ message: 'Guest/test user not available. Please create the test user first.' });
        }
        userId = guestUser.id;
      }
  
      // Set the authenticated user (or test user) as the seeker
      const requestData = {
        ...validationResult.data,
        userSeekerId: userId
      };
  
      // Analyze the request text
      const analysis = analyzeRequest(requestData.requestDescription);
  
      // Create the care request
      const careRequest = await storage.createCareRequest({
        ...requestData,
        requestSummary: analysis.summary,
        requestDetails: JSON.stringify(analysis.details)
      });
  
      res.status(201).json(careRequest);
    } catch (error) {
      res.status(500).json({ message: 'Error creating care request', error });
    }
  });

  app.get('/api/care-requests/:id', async (req: Request, res: Response) => {
    try {

      const requestId = parseInt(req.params.id);
      if (isNaN(requestId)) {
        return res.status(400).json({ message: 'Invalid request ID' });
      }

      const careRequest = await storage.getCareRequest(requestId);
      if (!careRequest) {
        return res.status(404).json({ 
          message: 'Care request not found',
          error: 'The requested care request does not exist'
        });
      }

      // Check if user is authorized to view this request
      if (careRequest.userSeekerId !== req.user.id && careRequest.userProviderId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to view this request' });
      }

      res.json(careRequest); 
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving care request', error });
    }
  });

  app.get('/api/care-requests', async (req: Request, res: Response) => {
    try {

      let careRequests: CareRequest[] = [];

      // Get requests based on user type
      if (req.user.userType === 'CARE_SEEKER') {
        careRequests = await storage.getCareRequestsBySeeker(req.user.id);
      } else if (req.user.userType === 'CARE_PROVIDER') {
        careRequests = await storage.getCareRequestsByProvider(req.user.id);
      }

      res.json(careRequests);
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving care requests', error });
    }
  });

  app.patch('/api/care-requests/:id', async (req: Request, res: Response) => {
    try {

      const requestId = parseInt(req.params.id);
      if (isNaN(requestId)) {
        return res.status(400).json({ message: 'Invalid request ID' });
      }

      const careRequest = await storage.getCareRequest(requestId);
      if (!careRequest) {
        return res.status(404).json({ message: 'Care request not found' });
      }

      // Authorization check
      const isSeeker = careRequest.userSeekerId === req.user.id;
      const isProvider = careRequest.userProviderId === req.user.id;

      if (!isSeeker && !isProvider) {
        return res.status(403).json({ message: 'Not authorized to update this request' });
      }

      // Different users can update different fields
      let updateData: Partial<CareRequest> = {};

      if (isSeeker) {
        // Seekers can update description, location, etc.
        const allowedFields = ['requestDescription', 'location', 'latitude', 'longitude', 'scheduledFor', 'duration'];
        for (const field of allowedFields) {
          if (field in req.body) {
            updateData[field as keyof CareRequest] = req.body[field];
          }
        }

        // If description changed, re-analyze
        if ('requestDescription' in req.body) {
          const analysis = analyzeRequest(req.body.requestDescription);
          updateData.requestSummary = analysis.summary;
          updateData.requestDetails = JSON.stringify(analysis.details);
        }
      }

      if (isProvider) {
        // Providers can update status
        if ('status' in req.body) {
          updateData.status = req.body.status;
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No valid fields to update' });
      }

      const updatedRequest = await storage.updateCareRequest(requestId, updateData);
      res.json(updatedRequest);
    } catch (error) {
      res.status(500).json({ message: 'Error updating care request', error });
    }
  });

  // Provider endpoints
  app.get('/api/providers', async (req: Request, res: Response) => {
    try {

      // Return exactly 5 random caregivers from the mock list
      const shuffled = mockProviders.sort(() => 0.5 - Math.random());
      res.json(shuffled.slice(0, 5));
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving providers', error });
    }
  });

  app.post('/api/provider-status', async (req: Request, res: Response) => {
    try {


      // Ensure user is a care provider
      if (req.user.userType !== 'CARE_PROVIDER') {
        return res.status(403).json({ message: 'Only care providers can update status' });
      }

      // Update provider status
      const status = await storage.updateProviderStatus(req.user.id, {
        isOnline: req.body.isOnline,
        latitude: req.body.latitude,
        longitude: req.body.longitude
      });

      res.json(status);
    } catch (error) {
      res.status(500).json({ message: 'Error updating provider status', error });
    }
  });

  // Match caregiver with a request
  app.post('/api/care-requests/:id/match', async (req: Request, res: Response) => {
    try {

      const requestId = parseInt(req.params.id);
      if (isNaN(requestId)) {
        return res.status(400).json({ message: 'Invalid request ID' });
      }

      const careRequest = await storage.getCareRequest(requestId);
      if (!careRequest) {
        return res.status(404).json({ message: 'Care request not found' });
      }

      // Only the seeker can assign a provider to their request
      if (careRequest.userSeekerId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to match this request' });
      }

      const providerId = req.body.providerId;
      if (!providerId) {
        return res.status(400).json({ message: 'Provider ID is required' });
      }

      // Make sure provider exists
      const provider = await storage.getUser(providerId);
      if (!provider || provider.userType !== 'CARE_PROVIDER') {
        return res.status(404).json({ message: 'Provider not found' });
      }

      // Update the request with the selected provider
      const updatedRequest = await storage.updateCareRequest(requestId, {
        userProviderId: providerId,
        status: 'MATCHED'
      });

      // Notify the provider through WebSocket if connected
      const providerWs = clients.get(providerId);
      if (providerWs && providerWs.readyState === WebSocket.OPEN) {
        providerWs.send(JSON.stringify({
          type: 'new-request',
          requestId: careRequest.id,
          seekerId: careRequest.userSeekerId
        }));
      }

      res.json(updatedRequest);
    } catch (error) {
      res.status(500).json({ message: 'Error matching care request', error });
    }
  });

  // Provider accept/decline request
  app.post('/api/care-requests/:id/respond', async (req: Request, res: Response) => {
    try {


      const requestId = parseInt(req.params.id);
      if (isNaN(requestId)) {
        return res.status(400).json({ message: 'Invalid request ID' });
      }

      const careRequest = await storage.getCareRequest(requestId);
      if (!careRequest) {
        return res.status(404).json({ message: 'Care request not found' });
      }

      // Only the assigned provider can respond
      if (careRequest.userProviderId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to respond to this request' });
      }

      const response = req.body.response;
      if (!response || (response !== 'ACCEPTED' && response !== 'DECLINED')) {
        return res.status(400).json({ message: 'Valid response (ACCEPTED/DECLINED) is required' });
      }

      // Update request status based on response
      const status = response === 'ACCEPTED' ? 'ACCEPTED' : 'DECLINED';
      const updatedRequest = await storage.updateCareRequest(requestId, { status });

      // Notify the seeker through WebSocket
      const seekerWs = clients.get(careRequest.userSeekerId);
      if (seekerWs && seekerWs.readyState === WebSocket.OPEN) {
        seekerWs.send(JSON.stringify({
          type: 'request-response',
          requestId: careRequest.id,
          providerId: req.user.id,
          status
        }));
      }

      res.json(updatedRequest);
    } catch (error) {
      res.status(500).json({ message: 'Error responding to care request', error });
    }
  });

  const mockProviders = [
    {
      id: 1,
      username: "sarah_thompson",
      fullName: "Sarah Thompson",
      isOnline: true,
      rating: 4.8,
      distance: Math.random() * 5,
      hourlyRate: 38,
      bio: "7+ years in aged care, specializing in personal support for seniors with mild cognitive impairments.",
      isVerified: true,
      skills: ["Companionship", "Household Help"],
      profileImageUrl: "/public/avatars/image18.jpg",
      latitude: 40.7109,
      longitude: -74.0055
    },
    {
      id: 2,
      username: "michael_reed",
      fullName: "Michael Reed",
      isOnline: true,
      rating: 4.5,
      distance: Math.random() * 5,
      hourlyRate: 38,
      bio: "5+ years as a registered nurse, focusing on post-surgery recovery and mobility training.",
      isVerified: true,
      skills: ["Medical", "Mobility Support"],
      profileImageUrl: "/public/avatars/image21.jpg",
      latitude: 40.7117,
      longitude: -74.0072
    },
    {
      id: 3,
      username: "emily_chen",
      fullName: "Emily Chen",
      isOnline: true,
      rating: 4.7,
      distance: Math.random() * 5,
      hourlyRate: 38,
      bio: "6+ years in disability support, assisting clients with mobility challenges and daily routines.",
      isVerified: true,
      skills: ["Mobility Support", "Companionship"],
      profileImageUrl: "/public/avatars/image17.jpg",
      latitude: 40.7103,
      longitude: -74.0041
    },
    {
      id: 4,
      username: "david_wilson",
      fullName: "David Wilson",
      isOnline: true,
      rating: 4.9,
      distance: Math.random() * 5,
      hourlyRate: 40,
      bio: "4+ years providing in-home personal care, including meal prep and light housekeeping.",
      isVerified: true,
      skills: ["Household Help", "Companionship"],
      profileImageUrl: "/public/avatars/image5.jpg",
      latitude: 40.7105,
      longitude: -74.0064
    },
    {
      id: 5,
      username: "maria_lopez",
      fullName: "Maria Lopez",
      isOnline: true,
      rating: 4.7,
      distance: Math.random() * 5,
      hourlyRate: 35,
      bio: "10+ years working in senior care, experienced in dementia and palliative care.",
      isVerified: true,
      skills: ["Dementia Care", "Medical"],
      profileImageUrl: "/public/avatars/image1.jpg",
      latitude: 40.7147,
      longitude: -74.003
    },
    {
      id: 6,
      username: "john_carter",
      fullName: "John Carter",
      isOnline: true,
      rating: 4.9,
      distance: Math.random() * 5,
      hourlyRate: 42,
      bio: "3+ years in aged care, helping with daily activities and companionship.",
      isVerified: true,
      skills: ["Mobility Support", "Companionship"],
      profileImageUrl: "/public/avatars/image9.jpg",
      latitude: 40.7115,
      longitude: -74.0075
    },
    {
      id: 7,
      username: "anna_nguyen",
      fullName: "Anna Nguyen",
      isOnline: true,
      rating: 4.6,
      distance: Math.random() * 5,
      hourlyRate: 45,
      bio: "8+ years in palliative care, offering emotional and physical support for elderly patients.",
      isVerified: true,
      skills: ["Medical", "Mobility"],
      profileImageUrl: "/public/avatars/image4.jpg",
      latitude: 40.7133,
      longitude: -74.0052
    },
    {
      id: 8,
      username: "james_patel",
      fullName: "James Patel",
      isOnline: true,
      rating: 4.7,
      distance: Math.random() * 5,
      hourlyRate: 38,
      bio: "5+ years in home nursing, assisting with medication management and light therapy.",
      isVerified: true,
      skills: ["Household Help", "Medical"],
      profileImageUrl: "/public/avatars/image13.jpg",
      latitude: 40.7124,
      longitude: -74.0048
    },
    {
      id: 9,
      username: "olivia_brown",
      fullName: "Olivia Brown",
      isOnline: true,
      rating: 4.6,
      distance: Math.random() * 5,
      hourlyRate: 42,
      bio: "6+ years as a dementia care specialist, supporting seniors with memory impairments.",
      isVerified: true,
      skills: ["Dementia", "Companionship"],
      profileImageUrl: "/public/avatars/image14.jpg",
      latitude: 40.7111,
      longitude: -74.0069
    },
    {
      id: 10,
      username: "ethan_scott",
      fullName: "Ethan Scott",
      isOnline: true,
      rating: 4.8,
      distance: Math.random() * 5,
      hourlyRate: 40,
      bio: "4+ years in hospital care, specializing in wound care and mobility rehabilitation.",
      isVerified: true,
      skills: ["Medical", "Mobility Support"],
      profileImageUrl: "/public/avatars/image7.jpg",
      latitude: 40.7139,
      longitude: -74.0045
    },
    {
      id: 11,
      username: "lucy_walker",
      fullName: "Lucy Walker",
      isOnline: true,
      rating: 4.9,
      distance: Math.random() * 5,
      hourlyRate: 35,
      bio: "7+ years in aged care, assisting seniors with errands and social engagement.",
      isVerified: true,
      skills: ["Household Help", "Mobility"],
      profileImageUrl: "/public/avatars/image20.jpg",
      latitude: 40.7123,
      longitude: -74.0039
    },
    {
      id: 12,
      username: "kevin_adams",
      fullName: "Kevin Adams",
      isOnline: true,
      rating: 4.7,
      distance: Math.random() * 5,
      hourlyRate: 45,
      bio: "9+ years in disability care, providing mobility assistance and therapy support.",
      isVerified: true,
      skills: ["Medical", "Mobility", "Household Help"],
      profileImageUrl: "/public/avatars/image16.jpg",
      latitude: 40.7145,
      longitude: -74.0044
    },
    {
      id: 13,
      username: "sophia_lee",
      fullName: "Sophia Lee",
      isOnline: true,
      rating: 4.6,
      distance: Math.random() * 5,
      hourlyRate: 38,
      bio: "5+ years in community care, focused on social connection and home maintenance.",
      isVerified: true,
      skills: ["Companionship", "Household Help"],
      profileImageUrl: "/public/avatars/image2.jpg",
      latitude: 40.7121,
      longitude: -74.0033
    },
    {
      id: 14,
      username: "daniel_baker",
      fullName: "Daniel Baker",
      isOnline: true,
      rating: 4.7,
      distance: Math.random() * 5,
      hourlyRate: 40,
      bio: "6+ years in respite care, offering short-term support for caregivers and families.",
      isVerified: true,
      skills: ["Dementia", "Medical"],
      profileImageUrl: "/public/avatars/image6.jpg",
      latitude: 40.7108,
      longitude: -74.0068
    },
    {
      id: 15,
      username: "emma_white",
      fullName: "Emma White",
      isOnline: true,
      rating: 4.9,
      distance: Math.random() * 5,
      hourlyRate: 42,
      bio: "3+ years assisting seniors with personal care and home organization.",
      isVerified: true,
      skills: ["Household Help", "Mobility"],
      profileImageUrl: "/public/avatars/image19.jpg",
      latitude: 40.7131,
      longitude: -74.0042
    }  ,{
      id: 16,
      username: "benjamin_hall",
      fullName: "Benjamin Hall",
      isOnline: true,
      rating: 4.8,
      distance: Math.random() * 5,
      hourlyRate: 35,
      bio: "8+ years in aged care, specializing in mental well-being for the elderly.",
      isVerified: true,
      skills: ["Companionship", "Dementia"],
      profileImageUrl: "/public/avatars/image10.jpg",
      latitude: 40.7116,
      longitude: -74.0057
    },
    {
      id: 17,
      username: "chloe_martin",
      fullName: "Chloe Martin",
      isOnline: true,
      rating: 4.7,
      distance: Math.random() * 5,
      hourlyRate: 38,
      bio: "7+ years in personal support, helping seniors maintain independence at home.",
      isVerified: true,
      skills: ["Household Help", "Mobility"],
      profileImageUrl: "/public/avatars/image12.jpg",
      latitude: 40.7125,
      longitude: -74.0036
    },
    {
      id: 18,
      username: "liam_harris",
      fullName: "Liam Harris",
      isOnline: true,
      rating: 4.6,
      distance: Math.random() * 5,
      hourlyRate: 45,
      bio: "4+ years as a geriatric nurse, handling complex medical needs and rehabilitation.",
      isVerified: true,
      skills: ["Medical", "Mobility", "Dementia"],
      profileImageUrl: "/public/avatars/image11.jpg",
      latitude: 40.7137,
      longitude: -74.0051
    },
    {
      id: 19,
      username: "zoe_robinson",
      fullName: "Zoe Robinson",
      isOnline: true,
      rating: 4.8,
      distance: Math.random() * 5,
      hourlyRate: 40,
      bio: "4+ years in community support, providing companionship and daily assistance.",
      isVerified: true,
      skills: ["Companionship", "Household Help"],
      profileImageUrl: "/public/avatars/image8.jpg",
      latitude: 40.7104,
      longitude: -74.0062
    },
    {
      id: 20,
      username: "noah_evans",
      fullName: "Noah Evans",
      isOnline: true,
      rating: 4.7,
      distance: Math.random() * 5,
      hourlyRate: 38,
      bio: "6+ years in senior home care, with expertise in fall prevention and medication reminders.",
      isVerified: true,
      skills: ["Medical", "Mobility"],
      profileImageUrl: "/public/avatars/image3.jpg",
      latitude: 40.7132,
      longitude: -74.0071
    },
    {
      id: 21,
      username: "noah_campbell",
      fullName: "Noah Campbell",
      isOnline: true,
      rating: 4.9,
      distance: Math.random() * 5,
      hourlyRate: 42,
      bio: "6+ years as a home nurse, specializing in post-hospitalization recovery.",
      isVerified: true,
      skills: ["Medical", "Mobility Support"],
      profileImageUrl: "/public/avatars/image15.jpg",
      latitude: 40.7126,
      longitude: -74.0038
    }
    ];


  return httpServer;
}