import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Twitter, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SocialMediaSubmitProps {
  onSubmissionSuccess?: () => void;
}

export default function SocialMediaSubmit({ onSubmissionSuccess }: SocialMediaSubmitProps) {
  const [username, setUsername] = useState('');
  const [tweetUrl, setTweetUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !tweetUrl.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both your username and tweet URL",
        variant: "destructive"
      });
      return;
    }

    // Validate tweet URL format
    const tweetUrlPattern = /^https:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/;
    if (!tweetUrlPattern.test(tweetUrl)) {
      toast({
        title: "Invalid Tweet URL",
        description: "Please provide a valid Twitter/X.com tweet URL",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/social-media/submit-tweet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          tweetUrl: tweetUrl.trim(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsSubmitted(true);
        toast({
          title: "Tweet Submitted Successfully!",
          description: result.message,
        });
        
        // Clear form
        setUsername('');
        setTweetUrl('');
        
        if (onSubmissionSuccess) {
          onSubmissionSuccess();
        }
      } else {
        toast({
          title: "Submission Failed",
          description: result.error || "Failed to process tweet submission",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Tweet submission error:', error);
      toast({
        title: "Network Error",
        description: "Failed to submit tweet. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-md mx-auto bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900/50 p-3">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900 dark:text-green-100">
                Tweet Submitted!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                You are now eligible for program rewards
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsSubmitted(false)}
              className="text-green-700 border-green-300 hover:bg-green-50 dark:text-green-300 dark:border-green-700 dark:hover:bg-green-900/30"
            >
              Submit Another Tweet
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Twitter className="h-5 w-5 text-blue-500" />
          Submit Tweet for Rewards
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Your Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="e.g., Rishant_Kumar"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tweetUrl">Tweet URL</Label>
            <Input
              id="tweetUrl"
              type="url"
              placeholder="https://x.com/username/status/123456789"
              value={tweetUrl}
              onChange={(e) => setTweetUrl(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Share your tweet about the KILT Liquidity Portal
            </p>
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <p className="font-medium">Requirements:</p>
              <ul className="mt-1 space-y-1">
                <li>• Tweet must mention the KILT Liquidity Portal</li>
                <li>• Must be a public tweet (not protected)</li>
                <li>• One submission per user</li>
              </ul>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : 'Submit Tweet'}
          </Button>
        </form>
        
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Example submission: Rishant_Kumar already submitted{' '}
            <ExternalLink className="h-3 w-3 inline" />
          </p>
        </div>
      </CardContent>
    </Card>
  );
}