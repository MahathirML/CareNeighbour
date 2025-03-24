import { users, User, InsertUser, careRequests, CareRequest, InsertCareRequest, providerStatus, ProviderStatus, InsertProviderStatus, userTypes } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

// Create the memory store
const MemoryStore = createMemoryStore(session);
type MemoryStoreInstance = ReturnType<typeof createMemoryStore> extends new (...args: any[]) => infer R ? R : never;

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  
  // Care request methods
  createCareRequest(request: InsertCareRequest): Promise<CareRequest>;
  getCareRequest(id: number): Promise<CareRequest | undefined>;
  getCareRequestsBySeeker(seekerId: number): Promise<CareRequest[]>;
  getCareRequestsByProvider(providerId: number): Promise<CareRequest[]>;
  updateCareRequest(id: number, request: Partial<CareRequest>): Promise<CareRequest | undefined>;
  
  // Provider status methods
  getProviderStatus(userId: number): Promise<ProviderStatus | undefined>;
  updateProviderStatus(userId: number, status: Partial<InsertProviderStatus>): Promise<ProviderStatus>;
  getAllAvailableProviders(): Promise<ProviderStatus[]>;
  
  // Available session store
  sessionStore: MemoryStoreInstance;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private careRequests: Map<number, CareRequest>;
  private providerStatuses: Map<number, ProviderStatus>;
  private userCurrentId: number;
  private requestCurrentId: number;
  private statusCurrentId: number;
  sessionStore: MemoryStoreInstance;

  constructor() {
    this.users = new Map();
    this.careRequests = new Map();
    this.providerStatuses = new Map();
    this.userCurrentId = 1;
    this.requestCurrentId = 1;
    this.statusCurrentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const now = new Date();
    const user: User = { 
      id, 
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email || null,
      phoneNumber: insertUser.phoneNumber || null,
      fullName: insertUser.fullName || null,
      userType: insertUser.userType as typeof userTypes[number] || null,
      profileImageUrl: insertUser.profileImageUrl || null,
      isVerified: insertUser.isVerified || false,
      rating: 0, 
      totalReviews: 0,
      hourlyRate: insertUser.hourlyRate || null,
      bio: insertUser.bio || null,
      createdAt: now 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser: User = { ...existingUser, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Care request methods
  async createCareRequest(insertRequest: InsertCareRequest): Promise<CareRequest> {
    const id = this.requestCurrentId++;
    const now = new Date();
    
    const careRequest: CareRequest = {
      id,
      userSeekerId: insertRequest.userSeekerId,
      userProviderId: null, // Initialize as null
      requestDescription: insertRequest.requestDescription,
      requestSummary: insertRequest.requestSummary || null,
      requestDetails: insertRequest.requestDetails || null,
      status: "PENDING",
      duration: insertRequest.duration || null,
      estimatedCost: insertRequest.estimatedCost || null,
      location: insertRequest.location || null,
      latitude: insertRequest.latitude || null,
      longitude: insertRequest.longitude || null,
      createdAt: now,
      scheduledFor: insertRequest.scheduledFor || null
    };
    
    this.careRequests.set(id, careRequest);
    return careRequest;
  }

  async getCareRequest(id: number): Promise<CareRequest | undefined> {
    return this.careRequests.get(id);
  }

  async getCareRequestsBySeeker(seekerId: number): Promise<CareRequest[]> {
    return Array.from(this.careRequests.values()).filter(
      (request) => request.userSeekerId === seekerId
    );
  }

  async getCareRequestsByProvider(providerId: number): Promise<CareRequest[]> {
    return Array.from(this.careRequests.values()).filter(
      (request) => request.userProviderId === providerId
    );
  }

  async updateCareRequest(id: number, requestData: Partial<CareRequest>): Promise<CareRequest | undefined> {
    const existingRequest = this.careRequests.get(id);
    if (!existingRequest) return undefined;
    
    const updatedRequest: CareRequest = { ...existingRequest, ...requestData };
    this.careRequests.set(id, updatedRequest);
    return updatedRequest;
  }

  // Provider status methods
  async getProviderStatus(userId: number): Promise<ProviderStatus | undefined> {
    return Array.from(this.providerStatuses.values()).find(
      (status) => status.userId === userId
    );
  }

  async updateProviderStatus(userId: number, statusData: Partial<InsertProviderStatus>): Promise<ProviderStatus> {
    const existingStatus = await this.getProviderStatus(userId);
    
    if (existingStatus) {
      const updatedStatus: ProviderStatus = { 
        ...existingStatus, 
        ...statusData, 
        lastUpdated: new Date() 
      };
      this.providerStatuses.set(existingStatus.id, updatedStatus);
      return updatedStatus;
    } else {
      const id = this.statusCurrentId++;
      const now = new Date();
      
      const newStatus: ProviderStatus = {
        id,
        userId,
        isOnline: statusData.isOnline || false,
        latitude: statusData.latitude || null,
        longitude: statusData.longitude || null,
        lastUpdated: now
      };
      
      this.providerStatuses.set(id, newStatus);
      return newStatus;
    }
  }

  async getAllAvailableProviders(): Promise<ProviderStatus[]> {
    return Array.from(this.providerStatuses.values()).filter(
      (status) => status.isOnline === true
    );
  }
}

export const storage = new MemStorage();
