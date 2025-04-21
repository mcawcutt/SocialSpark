import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

/**
 * Middleware to require authentication for routes
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Check if the user is authenticated
  if (req.isAuthenticated()) {
    return next();
  }

  // If not authenticated, respond with 401 Unauthorized
  return res.status(401).json({
    message: "Unauthorized",
    detail: "Please log in to access this resource"
  });
}

/**
 * Middleware to require specific user roles
 * @param roles Array of roles allowed to access the route
 */
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // First ensure the user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        message: "Unauthorized",
        detail: "Please log in to access this resource"
      });
    }

    // Then check if they have the required role
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Forbidden",
        detail: "You do not have permission to access this resource"
      });
    }

    next();
  };
}

/**
 * Middleware to require brand or admin role
 */
export function requireBrandOrAdmin(req: Request, res: Response, next: NextFunction) {
  // First ensure the user is authenticated
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      message: "Unauthorized",
      detail: "Please log in to access this resource"
    });
  }

  // Then check if they have the required role
  if (req.user.role !== 'brand' && req.user.role !== 'admin') {
    return res.status(403).json({
      message: "Forbidden",
      detail: "Only brand owners and administrators can perform this action"
    });
  }

  next();
}