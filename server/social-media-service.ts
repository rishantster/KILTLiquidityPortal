// Social Media Processing Service
// Handles tweet submissions and social media integration for the KILT Liquidity Portal

interface TweetSubmission {
  userId: string;
  username: string;
  tweetUrl: string;
  submittedAt: Date;
  processed: boolean;
  rewardEligible?: boolean;
}

interface SocialMediaMetrics {
  totalSubmissions: number;
  processedSubmissions: number;
  eligibleUsers: number;
  recentSubmissions: TweetSubmission[];
}

class SocialMediaService {
  private submissions: Map<string, TweetSubmission> = new Map();

  // Process a new tweet submission
  async processTweetSubmission(username: string, tweetUrl: string): Promise<{ success: boolean; message: string; submissionId?: string }> {
    try {
      // Validate tweet URL format
      if (!this.isValidTweetUrl(tweetUrl)) {
        return { success: false, message: "Invalid tweet URL format" };
      }

      // Check if user already submitted
      const existingSubmission = Array.from(this.submissions.values())
        .find(sub => sub.username.toLowerCase() === username.toLowerCase());

      if (existingSubmission) {
        return { success: false, message: "User has already submitted a tweet" };
      }

      // Create new submission
      const submissionId = `tweet_${Date.now()}_${username}`;
      const submission: TweetSubmission = {
        userId: submissionId,
        username,
        tweetUrl,
        submittedAt: new Date(),
        processed: true, // Auto-approve for now
        rewardEligible: true
      };

      this.submissions.set(submissionId, submission);

      console.log(`✅ Tweet submission processed for ${username}: ${tweetUrl}`);
      
      return {
        success: true,
        message: "Tweet submission processed successfully! You are now eligible for program rewards.",
        submissionId
      };

    } catch (error) {
      console.error('Error processing tweet submission:', error);
      return { success: false, message: "Failed to process tweet submission" };
    }
  }

  // Validate tweet URL format
  private isValidTweetUrl(url: string): boolean {
    const tweetUrlPattern = /^https:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/;
    return tweetUrlPattern.test(url);
  }

  // Get all submissions
  getSubmissions(): TweetSubmission[] {
    return Array.from(this.submissions.values());
  }

  // Get submission by username
  getSubmissionByUsername(username: string): TweetSubmission | undefined {
    return Array.from(this.submissions.values())
      .find(sub => sub.username.toLowerCase() === username.toLowerCase());
  }

  // Get social media metrics
  getMetrics(): SocialMediaMetrics {
    const submissions = Array.from(this.submissions.values());
    return {
      totalSubmissions: submissions.length,
      processedSubmissions: submissions.filter(sub => sub.processed).length,
      eligibleUsers: submissions.filter(sub => sub.rewardEligible).length,
      recentSubmissions: submissions
        .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
        .slice(0, 10)
    };
  }

  // Check if user is eligible based on tweet submission
  isUserEligible(username: string): boolean {
    const submission = this.getSubmissionByUsername(username);
    return submission?.rewardEligible === true;
  }
}

export const socialMediaService = new SocialMediaService();

// Process the existing submission from Rishant_Kumar
socialMediaService.processTweetSubmission(
  "Rishant_Kumar", 
  "https://x.com/officially_rish/status/1962356815925970270?s=48"
).then(result => {
  if (result.success) {
    console.log("🎉 Processed existing submission from Rishant_Kumar:", result.message);
  }
});