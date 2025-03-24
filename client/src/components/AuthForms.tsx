import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    fullName: z.string().min(2, "Full name is required"),
    // Make email and phone optional
    email: z
      .string()
      .email("Invalid email address")
      .optional()
      .or(z.literal("")),
    phoneNumber: z.string().optional().or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export function AuthForms() {
  const { loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register" | "guest">(
    "login",
  );
  const [, navigate] = useLocation();

  const handleGuestLogin = () => {
    navigate("/guest");
  };

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  function onLoginSubmit(values: LoginFormValues) {
    loginMutation.mutate(values);
  }

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
      phoneNumber: "",
      fullName: "",
    },
  });

  function onRegisterSubmit(values: RegisterFormValues) {
    // Add CARE_SEEKER as default userType when registering
    // The user can change this later in the UserTypePage
    registerMutation.mutate({
      ...values,
      userType: "CARE_SEEKER",
    });
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as "login" | "register")}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-3 mb-8">
        <TabsTrigger value="login">Sign In</TabsTrigger>
        <TabsTrigger value="register">Create Account</TabsTrigger>
        <TabsTrigger value="guest">Guest</TabsTrigger>
      </TabsList>

      <TabsContent value="login">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-neutral-800 mb-2">
            Welcome Back
          </h2>
          <p className="text-neutral-500">
            Sign in to continue to CareNeighbor
          </p>
        </div>

        {loginMutation.error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{loginMutation.error.message}</AlertDescription>
          </Alert>
        )}

        <Form {...loginForm}>
          <form
            onSubmit={loginForm.handleSubmit(onLoginSubmit)}
            className="space-y-4"
          >
            <FormField
              control={loginForm.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="yourusername" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={loginForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full py-3 rounded-xl font-semibold text-lg shadow-md hover:shadow-lg transition bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </Form>

        <div className="mt-4 text-center text-neutral-400 text-sm">
          Don't have an account?{" "}
          <a
            href="#"
            onClick={() => setActiveTab("register")}
            className="text-primary font-medium hover:underline"
          >
            Sign Up
          </a>
        </div>
      </TabsContent>

      <TabsContent value="register">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-neutral-800 mb-2">
            Create Account
          </h2>
          <p className="text-neutral-500">
            Join CareNeighbor to connect with caregivers
          </p>
        </div>

        {registerMutation.error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {registerMutation.error.message}
            </AlertDescription>
          </Alert>
        )}

        <Form {...registerForm}>
          <form
            onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
            className="space-y-4"
          >
            <FormField
              control={registerForm.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={registerForm.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="yourusername" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email and phone fields removed for minimalism */}

            <FormField
              control={registerForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={registerForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full py-3 rounded-xl font-semibold text-lg shadow-md hover:shadow-lg transition bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </Form>

        <div className="mt-4 text-center text-neutral-400 text-sm">
          Already have an account?{" "}
          <a
            href="#"
            onClick={() => setActiveTab("login")}
            className="text-primary font-medium hover:underline"
          >
            Sign In
          </a>
        </div>
      </TabsContent>

      <TabsContent value="guest" className="animate-slide-up">
        <div className="text-center p-6">
          <h2 className="text-xl font-semibold text-neutral-800 mb-4">
            Continue as Guest
          </h2>
          <p className="text-neutral-500 mb-6">
            Experience CareNeighbor without creating an account
          </p>
          <Button onClick={handleGuestLogin} className="w-full">
            Enter as Guest
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}
