'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { EmptyState } from '@/components/common/empty-state';
import { Target, Plus, Edit, Trash2, TrendingUp, Calendar, Banknote, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { format, differenceInMonths } from 'date-fns';

interface Goal {
  id: string;
  name: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  monthly_contribution?: number;
  created_at: string;
  status: 'active' | 'completed' | 'paused';
}

const goalCategories = [
  { value: 'retirement', label: 'Retirement' },
  { value: 'education', label: 'Education' },
  { value: 'home', label: 'Home Purchase' },
  { value: 'car', label: 'Car Purchase' },
  { value: 'vacation', label: 'Vacation' },
  { value: 'emergency', label: 'Emergency Fund' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'other', label: 'Other' },
];

const priorityColors = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  high: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_amount: '',
    current_amount: '',
    target_date: '',
    category: 'other',
    priority: 'medium' as 'low' | 'medium' | 'high',
    monthly_contribution: '',
  });

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/goals');
      // Backend might return items (paginated) or goals or direct array
      const data = response.data?.items || response.data?.goals || response.data || [];
      setGoals(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching goals:', error);
      setGoals([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        target_amount: parseFloat(formData.target_amount),
        current_amount: parseFloat(formData.current_amount) || 0,
        monthly_contribution: formData.monthly_contribution ? parseFloat(formData.monthly_contribution) : null,
      };

      if (editingGoal) {
        await api.put(`/goals/${editingGoal.id}`, payload);
      } else {
        await api.post('/goals', payload);
      }

      fetchGoals();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving goal:', error);
    }
  };

  const handleDelete = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    try {
      await api.delete(`/goals/${goalId}`);
      fetchGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      description: goal.description || '',
      target_amount: goal.target_amount.toString(),
      current_amount: goal.current_amount.toString(),
      target_date: goal.target_date.split('T')[0],
      category: goal.category,
      priority: goal.priority,
      monthly_contribution: goal.monthly_contribution?.toString() || '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      target_amount: '',
      current_amount: '',
      target_date: '',
      category: 'other',
      priority: 'medium',
      monthly_contribution: '',
    });
    setEditingGoal(null);
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `Rs. ${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `Rs. ${(amount / 100000).toFixed(2)} L`;
    }
    return `Rs. ${amount.toLocaleString('en-PK')}`;
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getMonthsRemaining = (targetDate: string) => {
    return Math.max(differenceInMonths(new Date(targetDate), new Date()), 0);
  };

  const getRequiredMonthly = (goal: Goal) => {
    const remaining = goal.target_amount - goal.current_amount;
    const months = getMonthsRemaining(goal.target_date);
    return months > 0 ? remaining / months : remaining;
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" />;
  }

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const totalTargetAmount = activeGoals.reduce((sum, g) => sum + g.target_amount, 0);
  const totalCurrentAmount = activeGoals.reduce((sum, g) => sum + g.current_amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Financial Goals</h1>
          <p className="text-muted-foreground">
            Track and achieve your financial goals
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingGoal ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
              <DialogDescription>
                Set your financial target and track your progress
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Goal Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Buy a House"
                />
              </div>

              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of your goal"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Amount (Rs.)</Label>
                  <Input
                    type="number"
                    value={formData.target_amount}
                    onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                    placeholder="1000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Savings (Rs.)</Label>
                  <Input
                    type="number"
                    value={formData.current_amount}
                    onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Target Date</Label>
                <Input
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {goalCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: 'low' | 'medium' | 'high') => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Monthly Contribution (Rs.) - Optional</Label>
                <Input
                  type="number"
                  value={formData.monthly_contribution}
                  onChange={(e) => setFormData({ ...formData, monthly_contribution: e.target.value })}
                  placeholder="5000"
                />
              </div>

              <Button onClick={handleSubmit} className="w-full">
                {editingGoal ? 'Update Goal' : 'Create Goal'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Goals</p>
                <p className="text-2xl font-bold">{activeGoals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <Sparkles className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedGoals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <Banknote className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Target</p>
                <p className="text-2xl font-bold">{formatCurrency(totalTargetAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-500/10">
                <TrendingUp className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Saved</p>
                <p className="text-2xl font-bold">{formatCurrency(totalCurrentAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No Goals Yet"
          description="Create your first financial goal to start tracking your progress"
          action={
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Goal
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const progress = getProgressPercentage(goal.current_amount, goal.target_amount);
            const monthsRemaining = getMonthsRemaining(goal.target_date);
            const requiredMonthly = getRequiredMonthly(goal);

            return (
              <Card key={goal.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{goal.name}</CardTitle>
                      {goal.description && (
                        <CardDescription className="mt-1">{goal.description}</CardDescription>
                      )}
                    </div>
                    <Badge className={priorityColors[goal.priority]}>
                      {goal.priority}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-muted-foreground">{formatCurrency(goal.current_amount)}</span>
                      <span className="font-medium">{formatCurrency(goal.target_amount)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 rounded-lg bg-muted">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Time Left</span>
                      </div>
                      <p className="font-medium mt-1">
                        {monthsRemaining > 0 ? `${monthsRemaining} months` : 'Overdue'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Banknote className="h-3 w-3" />
                        <span>Need/Month</span>
                      </div>
                      <p className="font-medium mt-1">{formatCurrency(requiredMonthly)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <Badge variant="outline">
                      {goalCategories.find(c => c.value === goal.category)?.label || goal.category}
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(goal)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(goal.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
