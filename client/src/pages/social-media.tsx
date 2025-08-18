import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Twitter, Users, MessageSquare, Calendar, ExternalLink } from 'lucide-react';
import SocialMediaSubmit from '@/components/social-media-submit';

interface Submission {
  userId: string;
  username: string;
  tweetUrl: string;
  submittedAt: string;
  processed: boolean;
  rewardEligible: boolean;
}

interface Metrics {
  totalSubmissions: number;
  processedSubmissions: number;
  eligibleUsers: number;
  recentSubmissions: Submission[];
}

export default function SocialMediaPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch metrics and submissions in parallel
      const [metricsResponse, submissionsResponse] = await Promise.all([
        fetch('/api/social-media/metrics'),
        fetch('/api/social-media/submissions')
      ]);

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
      }

      if (submissionsResponse.ok) {
        const submissionsData = await submissionsResponse.json();
        setSubmissions(submissionsData);
      }
    } catch (error) {
      console.error('Error fetching social media data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmissionSuccess = () => {
    // Refresh data after successful submission
    fetchData();
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Social Media Integration
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Share your experience with the KILT Liquidity Portal and become eligible for additional rewards
        </p>
      </div>

      {/* Social Media Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Submissions</p>
                  <p className="text-2xl font-bold">{metrics.totalSubmissions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Eligible Users</p>
                  <p className="text-2xl font-bold">{metrics.eligibleUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Twitter className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Processed</p>
                  <p className="text-2xl font-bold">{metrics.processedSubmissions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Submit Form */}
      <div className="flex justify-center">
        <SocialMediaSubmit onSubmissionSuccess={handleSubmissionSuccess} />
      </div>

      {/* Recent Submissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Submissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading submissions...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-8">
              <Twitter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No submissions yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Be the first to share your tweet about the KILT Liquidity Portal!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission, index) => (
                <div
                  key={submission.userId}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                      <Twitter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium">{submission.username}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(submission.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {submission.rewardEligible && (
                      <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                        Eligible
                      </span>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(submission.tweetUrl, '_blank')}
                      className="flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Tweet
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">How Social Media Integration Works</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Eligibility Requirements</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Tweet must mention the KILT Liquidity Portal</li>
                <li>• Tweet must be public and accessible</li>
                <li>• One submission per user</li>
                <li>• Valid Twitter/X.com URL format required</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Reward Benefits</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Become eligible for additional program rewards</li>
                <li>• Automatic processing and verification</li>
                <li>• Permanent eligibility status</li>
                <li>• Community recognition</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}