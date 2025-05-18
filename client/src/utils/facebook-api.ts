import axios from 'axios';

/**
 * Posts a message to a Facebook Page
 * @param pageId The Facebook Page ID
 * @param message The message content to post
 * @param accessToken The page access token
 * @param imageUrl Optional image URL to include with the post
 * @returns Promise with the posting result
 */
export async function postToFacebookPage(
  pageId: string,
  message: string,
  accessToken: string,
  imageUrl?: string
): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    // Determine if we're posting with an image or just text
    let endpoint = `https://graph.facebook.com/v17.0/${pageId}/feed`;
    let payload: Record<string, string> = {
      message,
      access_token: accessToken,
    };
    
    // If image URL is provided, use it
    if (imageUrl) {
      if (imageUrl.startsWith('/uploads/')) {
        // Convert relative URL to absolute
        const baseUrl = window.location.origin;
        imageUrl = `${baseUrl}${imageUrl}`;
      }
      
      // Use photos endpoint for image posts
      endpoint = `https://graph.facebook.com/v17.0/${pageId}/photos`;
      payload.url = imageUrl;
    }
    
    const response = await axios.post(endpoint, payload);
    
    return {
      success: true,
      postId: response.data.id,
    };
  } catch (error) {
    console.error('Error posting to Facebook:', error);
    
    // Extract the error message
    let errorMessage = 'Failed to post to Facebook';
    if (axios.isAxiosError(error) && error.response) {
      errorMessage = error.response.data?.error?.message || errorMessage;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Posts to a Facebook Page from a content post
 * This is a wrapper function that can be called from a component
 */
export async function publishToFacebook(
  contentPost: { 
    description: string; 
    imageUrl?: string;
  },
  pageInfo: { 
    id: string; 
    accessToken: string; 
    name: string;
  }
): Promise<void> {
  try {
    const result = await postToFacebookPage(
      pageInfo.id,
      contentPost.description,
      pageInfo.accessToken,
      contentPost.imageUrl
    );
    
    if (result.success) {
      alert(`Successfully posted to ${pageInfo.name}!`);
    } else {
      alert(`Error posting to Facebook: ${result.error}`);
    }
  } catch (error) {
    console.error('Error in publishToFacebook:', error);
    alert('Failed to post to Facebook. Please try again.');
  }
}