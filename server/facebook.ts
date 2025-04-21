import axios from 'axios';

/**
 * Creates a Facebook post on a page owned by a user
 * @param pageId The ID of the page to post to
 * @param message The text message for the post
 * @param imageUrl Optional URL to an image to include in the post
 * @param accessToken The page access token for the page
 * @returns The Facebook post ID and URL if successful
 */
export async function createFacebookPost(
  pageId: string,
  message: string,
  imageUrl?: string,
  accessToken?: string
): Promise<{ id: string; post_url: string }> {
  if (!accessToken) {
    throw new Error('No access token provided for Facebook post');
  }

  try {
    let response;
    const apiUrl = `https://graph.facebook.com/v19.0/${pageId}/feed`;

    if (imageUrl) {
      // Post with an image
      response = await axios.post(apiUrl, {
        message,
        link: imageUrl,
        access_token: accessToken,
      });
    } else {
      // Text-only post
      response = await axios.post(apiUrl, {
        message,
        access_token: accessToken,
      });
    }

    console.log('Facebook post created:', response.data);
    
    return {
      id: response.data.id,
      post_url: `https://facebook.com/${response.data.id}`,
    };
  } catch (error) {
    console.error('Error creating Facebook post:', error.response?.data || error.message);
    throw new Error(`Failed to create Facebook post: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Gets the pages a user has access to
 * @param accessToken The user access token
 * @returns Array of pages with name, id, access token, and permissions
 */
export async function getFacebookPages(accessToken: string): Promise<any[]> {
  try {
    const response = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
      params: {
        access_token: accessToken,
      },
    });

    return response.data.data;
  } catch (error) {
    console.error('Error getting Facebook pages:', error.response?.data || error.message);
    throw new Error(`Failed to get Facebook pages: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Retrieves information about a Facebook account
 * @param accessToken The user access token
 * @returns Basic user information
 */
export async function getFacebookUserInfo(accessToken: string): Promise<any> {
  try {
    const response = await axios.get('https://graph.facebook.com/v19.0/me', {
      params: {
        fields: 'id,name,email,picture',
        access_token: accessToken,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error getting Facebook user info:', error.response?.data || error.message);
    throw new Error(`Failed to get Facebook user info: ${error.response?.data?.error?.message || error.message}`);
  }
}