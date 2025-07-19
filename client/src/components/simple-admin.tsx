import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export function SimpleAdmin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Treasury form state
  const [totalAllocation, setTotalAllocation] = useState(600000);
  const [programDuration, setProgramDuration] = useState(120);
  const [updateLoading, setUpdateLoading] = useState(false);
  
  const { toast } = useToast();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        setIsAuthenticated(true);
        toast({ title: "Success", description: "Logged in successfully" });
      } else {
        toast({ title: "Error", description: "Invalid credentials", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Login failed", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleUpdateTreasury = async () => {
    setUpdateLoading(true);
    try {
      const requestData = {
        programBudget: totalAllocation,
        programDurationDays: programDuration,
        treasuryWalletAddress: '0x0000000000000000000000000000000000000000',
        isActive: true
      };

      console.log('Sending request:', requestData);

      const response = await fetch('/api/admin/treasury/config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Update successful:', result);
        toast({ title: "Success", description: "Treasury updated successfully" });
      } else {
        const error = await response.text();
        console.error('Update failed:', error);
        toast({ title: "Error", description: `Update failed: ${error}`, variant: "destructive" });
      }
    } catch (error) {
      console.error('Network error:', error);
      toast({ title: "Error", description: "Network error occurred", variant: "destructive" });
    }
    setUpdateLoading(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="w-96 bg-white/5 border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Admin Login</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="username" className="text-white">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-white/5 border-white/20 text-white"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/5 border-white/20 text-white"
              />
            </div>
            <Button 
              onClick={handleLogin} 
              disabled={loading}
              className="w-full bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <Button 
            onClick={() => setIsAuthenticated(false)} 
            variant="outline"
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            Logout
          </Button>
        </div>

        <Card className="bg-white/5 border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Treasury Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="allocation" className="text-white">Total Allocation (KILT)</Label>
              <Input
                id="allocation"
                type="number"
                value={totalAllocation}
                onChange={(e) => setTotalAllocation(parseInt(e.target.value) || 0)}
                className="bg-white/5 border-white/20 text-white"
              />
            </div>
            <div>
              <Label htmlFor="duration" className="text-white">Program Duration (Days)</Label>
              <Input
                id="duration"
                type="number"
                value={programDuration}
                onChange={(e) => setProgramDuration(parseInt(e.target.value) || 0)}
                className="bg-white/5 border-white/20 text-white"
              />
            </div>
            <Button 
              onClick={handleUpdateTreasury}
              disabled={updateLoading}
              className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
            >
              {updateLoading ? 'Updating...' : 'Update Treasury'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}