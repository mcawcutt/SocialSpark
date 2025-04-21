import { Request, Response, NextFunction } from "express";

/**
 * Middleware to require authentication for routes
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      message: "Unauthorized",
      detail: "Your session has expired or you are not logged in. Please log in to continue."
    });
  }
  next();
}

/**
 * Middleware to require specific user roles
 * @param roles Array of roles allowed to access the route
 */
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        message: "Unauthorized",
        detail: "Please log in to access this resource."
      });
    }

    if (!req.user || !req.user.role || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Forbidden",
        detail: "You do not have permission to access this resource."
      });
    }
    
    next();
  };
}

/**
 * Middleware to require brand or admin role
 */
export function requireBrandOrAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      message: "Unauthorized",
      detail: "Please log in to access this resource."
    });
  }

  if (!req.user || !req.user.role || (req.user.role !== 'brand' && req.user.role !== 'admin')) {
    return res.status(403).json({
      message: "Forbidden",
      detail: "You do not have permission to access this resource."
    });
  }
  
  next();
}