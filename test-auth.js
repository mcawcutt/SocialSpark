// Test script for authentication and impersonation
import axios from 'axios';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const baseUrl = 'http://localhost:5000';
const cookieFile = './cookies.txt';

// Helper for storing cookies between requests
let cookies = null;

// Save cookies to file
const saveCookies = () => {
  if (cookies) {
    fs.writeFileSync(cookieFile, JSON.stringify(cookies));
    console.log('Cookies saved to file');
  }
};

// Read cookies from file
const loadCookies = () => {
  try {
    if (fs.existsSync(cookieFile)) {
      const cookieData = fs.readFileSync(cookieFile, 'utf8');
      cookies = JSON.parse(cookieData);
      console.log('Cookies loaded from file');
    }
  } catch (error) {
    console.error('Error loading cookies:', error);
    // Reset cookies if there was an error
    cookies = null;
  }
};

// Login as admin
const loginAsAdmin = async () => {
  try {
    console.log('Logging in as admin...');
    const response = await axios.post(`${baseUrl}/api/demo-login`, 
      { role: 'admin' },
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...(cookies ? { 'Cookie': cookies } : {})
        },
        withCredentials: true
      }
    );
    
    // Save cookies for later requests
    if (response.headers['set-cookie']) {
      cookies = response.headers['set-cookie'][0];
      saveCookies();
    }
    
    console.log('Admin login successful!');
    console.log('User:', JSON.stringify(response.data.user, null, 2));
    return response.data.user;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
  }
};

// Login as brand
const loginAsBrand = async (brandUsername) => {
  try {
    console.log(`Logging in as brand: ${brandUsername}...`);
    const response = await axios.post(`${baseUrl}/api/demo-brand-login`, 
      { brandUsername },
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...(cookies ? { 'Cookie': cookies } : {})
        },
        withCredentials: true
      }
    );
    
    // Save cookies for later requests
    if (response.headers['set-cookie']) {
      cookies = response.headers['set-cookie'][0];
      saveCookies();
    }
    
    console.log('Brand login successful!');
    console.log('User:', JSON.stringify(response.data.user, null, 2));
    return response.data.user;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
  }
};

// Get current user
const getCurrentUser = async () => {
  try {
    console.log('Getting current user...');
    const response = await axios.get(`${baseUrl}/api/user`, 
      { 
        headers: { 
          ...(cookies ? { 'Cookie': cookies } : {})
        },
        withCredentials: true
      }
    );
    
    console.log('Current user:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Get user failed:', error.response?.data || error.message);
  }
};

// Impersonate a brand
const impersonateBrand = async (brandId) => {
  try {
    console.log(`Impersonating brand with ID: ${brandId}...`);
    const response = await axios.post(`${baseUrl}/api/admin/impersonate/${brandId}`, 
      {},
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...(cookies ? { 'Cookie': cookies } : {})
        },
        withCredentials: true
      }
    );
    
    // Save cookies for later requests
    if (response.headers['set-cookie']) {
      cookies = response.headers['set-cookie'][0];
      saveCookies();
    }
    
    console.log('Impersonation successful!');
    console.log('Result:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Impersonation failed:', error.response?.data || error.message);
  }
};

// End impersonation
const endImpersonation = async () => {
  try {
    console.log('Ending impersonation...');
    const response = await axios.post(`${baseUrl}/api/admin/end-impersonation`, 
      {},
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...(cookies ? { 'Cookie': cookies } : {})
        },
        withCredentials: true
      }
    );
    
    // Save cookies for later requests
    if (response.headers['set-cookie']) {
      cookies = response.headers['set-cookie'][0];
      saveCookies();
    }
    
    console.log('Ended impersonation!');
    console.log('Result:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('End impersonation failed:', error.response?.data || error.message);
  }
};

// Logout
const logout = async () => {
  try {
    console.log('Logging out...');
    const response = await axios.post(`${baseUrl}/api/logout`, 
      {},
      { 
        headers: { 
          ...(cookies ? { 'Cookie': cookies } : {})
        },
        withCredentials: true
      }
    );
    
    // Clear cookies
    cookies = '';
    saveCookies();
    
    console.log('Logout successful!');
    return true;
  } catch (error) {
    console.error('Logout failed:', error.response?.data || error.message);
  }
};

// Run tests
const runTests = async () => {
  // Load any saved cookies
  loadCookies();
  
  // Login as admin
  await loginAsAdmin();
  
  // Get current user to verify login
  await getCurrentUser();
  
  // Impersonate brand with ID 1 (Acme Brands)
  await impersonateBrand(1);
  
  // Get current user to verify impersonation
  await getCurrentUser();
  
  // End impersonation
  await endImpersonation();
  
  // Get current user to verify we're back to admin
  await getCurrentUser();
  
  // Login as brand directly
  await loginAsBrand('demo');
  
  // Get current user to verify brand login
  await getCurrentUser();
  
  // Logout
  await logout();
  
  console.log('All tests completed!');
};

// Run all tests
runTests();