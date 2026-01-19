import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Loader2, Mail } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function EmailVerificationStatus() {
  const { user } = useAuth();
  const [isResending, setIsResending] = useState(false);

  if (!user) return null;

  const isVerified = user.email_confirmed_at !== null;

  const handleResendVerification = async () => {
    if (!user.email) return;
    
    setIsResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    setIsResending(false);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Verification email sent',
        description: 'Please check your inbox and click the verification link.',
      });
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${isVerified ? 'bg-green-500/10 border-green-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full ${isVerified ? 'bg-green-500/20' : 'bg-amber-500/20'}`}>
          {isVerified ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-600" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-medium ${isVerified ? 'text-green-700' : 'text-amber-700'}`}>
              {isVerified ? 'Email Verified' : 'Email Not Verified'}
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isVerified 
              ? `Your email (${user.email}) has been verified.`
              : `Your email (${user.email}) has not been verified yet. Please verify to secure your account.`
            }
          </p>
          {!isVerified && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 gap-2"
              onClick={handleResendVerification}
              disabled={isResending}
            >
              {isResending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Resend Verification Email
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
