'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GoalsSkeleton, CardSkeleton } from '@/components/common/skeletons';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import {
  Target,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  Calendar,
  Banknote,
  Sparkles,
  Clock,
  ChevronRight,
  History,
  LineChart,
  Calculator,
  AlertCircle,
  CheckCircle,
  PauseCircle,
  PlayCircle,
  Loader2,
  Shield,
  Home,
  GraduationCap,
  Heart,
  Car,
  Plane,
  Briefcase,
  PiggyBank,
} from 'lucide-react';
import { api } from '@/lib/api';
import { format, differenceInMonths, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { ExportDropdown } from '@/components/common/export-dropdown';

interface Goal {
  id: string;
  name: string;
  notes?: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  goal_type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  linked_portfolio_id?: string;
  created_at: string;
  status: 'active' | 'achieved' | 'paused' | 'cancelled';
  progress?: {
    percentage: number;
    days_remaining: number;
    on_track: boolean;
  };
}

interface GoalType {
  id: string;
  name: string;
  description: string;
  icon: string;
  recommended_priority: string;
}

interface Contribution {
  id: string;
  amount: number;
  contribution_date: string;
  source?: string;
  notes?: string;
  created_at: string;
}

interface GoalSummary {
  active_count: number;
  achieved_count: number;
  paused_count: number;
  overall_progress: number;
  total_target: number;
  total_saved: number;
  goals_needing_attention: number;
}

interface Projection {
  remaining_amount: number;
  average_monthly_contribution: number;
  projected_months_to_complete: number;
  projected_completion_date: string;
  target_date: string;
  on_track: boolean;
  months_behind_or_ahead: number;
  suggested_monthly_increase?: number;
}

interface Suggestion {
  required_monthly: number;
  comfortable_monthly: number;
  aggressive_monthly: number;
  months_remaining: number;
}

const goalIcons: Record<string, any> = {
  emergency_fund: Shield,
  retirement: PiggyBank,
  house_purchase: Home,
  education: GraduationCap,
  wedding: Heart,
  vehicle: Car,
  vacation: Plane,
  business: Briefcase,
  investment: TrendingUp,
  other: Target,
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const statusIcons: Record<string, any> = {
  active: PlayCircle,
  achieved: CheckCircle,
  paused: PauseCircle,
  cancelled: AlertCircle,
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalTypes, setGoalTypes] = useState<GoalType[]>([]);
  const [summary, setSummary] = useState<GoalSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    notes: '',
    target_amount: '',
    current_amount: '',
    target_date: '',
    goal_type: 'investment',
    priority: 'medium' as Goal['priority'],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail sheet state
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [projection, setProjection] = useState<Projection | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Contribution dialog state
  const [isContributionDialogOpen, setIsContributionDialogOpen] = useState(false);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionSource, setContributionSource] = useState('');
  const [contributionNotes, setContributionNotes] = useState('');
  const [isAddingContribution, setIsAddingContribution] = useState(false);

  // Suggestion state
  const [isSuggestionDialogOpen, setIsSuggestionDialogOpen] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  useEffect(() => {
    fetchGoals();
    fetchGoalTypes();
    fetchSummary();
  }, []);

  const fetchGoals = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/goals');
      const data = response.data?.goals || response.data || [];
      setGoals(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching goals:', error);
      setGoals([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGoalTypes = async () => {
    try {
      const response = await api.get('/goals/types');
      setGoalTypes(response.data?.types || []);
    } catch (error) {
      console.error('Error fetching goal types:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await api.get('/goals/summary');
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchGoalDetails = async (goalId: string) => {
    setIsLoadingDetail(true);
    try {
      const [contribRes, projRes, progressRes] = await Promise.all([
        api.get(`/goals/${goalId}/contributions`),
        api.post(`/goals/${goalId}/projection`, {}).catch(() => ({ data: null })),
        api.get(`/goals/${goalId}/progress`).catch(() => ({ data: null })),
      ]);

      setContributions(contribRes.data?.contributions || []);
      setProjection(projRes.data);
      // Progress data can be accessed through progressRes.data for detailed breakdown
      if (progressRes.data) {
        setProjection(prev => ({
          ...prev,
          ...progressRes.data,
        }));
      }
    } catch (error) {
      console.error('Error fetching goal details:', error);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        notes: formData.notes || null,
        target_amount: parseFloat(formData.target_amount),
        current_amount: parseFloat(formData.current_amount) || 0,
        target_date: formData.target_date || null,
        goal_type: formData.goal_type,
        priority: formData.priority,
      };

      if (editingGoal) {
        await api.put(`/goals/${editingGoal.id}`, payload);
      } else {
        await api.post('/goals', payload);
      }

      fetchGoals();
      fetchSummary();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving goal:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    try {
      await api.delete(`/goals/${goalId}`);
      fetchGoals();
      fetchSummary();
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      notes: goal.notes || '',
      target_amount: goal.target_amount.toString(),
      current_amount: goal.current_amount.toString(),
      target_date: goal.target_date ? goal.target_date.split('T')[0] : '',
      goal_type: goal.goal_type,
      priority: goal.priority,
    });
    setIsDialogOpen(true);
  };

  const handleViewDetails = (goal: Goal) => {
    setSelectedGoal(goal);
    fetchGoalDetails(goal.id);
    setIsDetailSheetOpen(true);
  };

  const handleAddContribution = async () => {
    if (!selectedGoal || !contributionAmount) return;

    setIsAddingContribution(true);
    try {
      await api.post(`/goals/${selectedGoal.id}/contributions`, {
        amount: parseFloat(contributionAmount),
        source: contributionSource || null,
        notes: contributionNotes || null,
      });

      setContributionAmount('');
      setContributionSource('');
      setContributionNotes('');
      setIsContributionDialogOpen(false);

      // Refresh data
      fetchGoals();
      fetchSummary();
      fetchGoalDetails(selectedGoal.id);
    } catch (error) {
      console.error('Error adding contribution:', error);
    } finally {
      setIsAddingContribution(false);
    }
  };

  const handlePauseResume = async (goal: Goal) => {
    try {
      if (goal.status === 'paused') {
        await api.post(`/goals/${goal.id}/resume`);
      } else {
        await api.post(`/goals/${goal.id}/pause`);
      }
      fetchGoals();
      fetchSummary();
    } catch (error) {
      console.error('Error updating goal status:', error);
    }
  };

  const handleMarkAchieved = async (goal: Goal) => {
    try {
      await api.post(`/goals/${goal.id}/mark-achieved`);
      fetchGoals();
      fetchSummary();
      setIsDetailSheetOpen(false);
    } catch (error) {
      console.error('Error marking goal as achieved:', error);
    }
  };

  const handleGetSuggestion = async () => {
    if (!formData.target_amount || !formData.target_date) return;

    setSuggestionLoading(true);
    try {
      const response = await api.post('/goals/suggest-contribution', {
        target_amount: parseFloat(formData.target_amount),
        current_amount: parseFloat(formData.current_amount) || 0,
        target_date: formData.target_date,
      });
      setSuggestion(response.data);
      setIsSuggestionDialogOpen(true);
    } catch (error) {
      console.error('Error getting suggestion:', error);
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      notes: '',
      target_amount: '',
      current_amount: '',
      target_date: '',
      goal_type: 'investment',
      priority: 'medium',
    });
    setEditingGoal(null);
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `PKR ${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `PKR ${(amount / 100000).toFixed(2)} L`;
    }
    return `PKR ${amount.toLocaleString('en-PK')}`;
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getMonthsRemaining = (targetDate: string) => {
    if (!targetDate) return 0;
    return Math.max(differenceInMonths(new Date(targetDate), new Date()), 0);
  };

  const getRequiredMonthly = (goal: Goal) => {
    if (!goal.target_date) return 0;
    const remaining = goal.target_amount - goal.current_amount;
    const months = getMonthsRemaining(goal.target_date);
    return months > 0 ? remaining / months : remaining;
  };

  const getGoalIcon = (goalType: string) => {
    return goalIcons[goalType] || Target;
  };

  if (isLoading) {
    return <GoalsSkeleton />;
  }

  const activeGoals = goals.filter((g) => g.status === 'active');
  const achievedGoals = goals.filter((g) => g.status === 'achieved');
  const pausedGoals = goals.filter((g) => g.status === 'paused');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Financial Goals</h1>
          <p className="text-muted-foreground">
            Track and achieve your financial goals with smart projections
          </p>
        </div>
        <div className="flex gap-2">
          <ExportDropdown type="goals" />
          <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingGoal ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
              <DialogDescription>
                Set your financial target and track your progress
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>Goal Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Buy a House"
                />
              </div>

              <div className="space-y-2">
                <Label>Goal Type</Label>
                <Select
                  value={formData.goal_type}
                  onValueChange={(value) => setFormData({ ...formData, goal_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {goalTypes.map((type) => {
                      const Icon = getGoalIcon(type.id);
                      return (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {type.name}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Amount (PKR)</Label>
                  <Input
                    type="number"
                    value={formData.target_amount}
                    onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                    placeholder="1000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Savings (PKR)</Label>
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

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: Goal['priority']) =>
                    setFormData({ ...formData, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about your goal..."
                  rows={2}
                />
              </div>

              {/* Suggestion Button */}
              {formData.target_amount && formData.target_date && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGetSuggestion}
                  disabled={suggestionLoading}
                >
                  {suggestionLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Calculator className="mr-2 h-4 w-4" />
                  )}
                  Get Monthly Contribution Suggestion
                </Button>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || !formData.name || !formData.target_amount}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : editingGoal ? (
                  'Update Goal'
                ) : (
                  'Create Goal'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
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
                <p className="text-2xl font-bold">{summary?.active_count || activeGoals.length}</p>
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
                <p className="text-sm text-muted-foreground">Achieved</p>
                <p className="text-2xl font-bold">{summary?.achieved_count || achievedGoals.length}</p>
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
                <p className="text-2xl font-bold">{formatCurrency(summary?.total_target || 0)}</p>
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
                <p className="text-sm text-muted-foreground">Overall Progress</p>
                <p className="text-2xl font-bold">{summary?.overall_progress?.toFixed(1) || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goals by Status */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeGoals.length})
          </TabsTrigger>
          <TabsTrigger value="achieved">
            Achieved ({achievedGoals.length})
          </TabsTrigger>
          <TabsTrigger value="paused">
            Paused ({pausedGoals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeGoals.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No Active Goals"
              description="Create your first financial goal to start tracking your progress"
              actionLabel="Create Goal"
              onAction={() => setIsDialogOpen(true)}
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {activeGoals.map((goal) => {
                const progress = getProgressPercentage(goal.current_amount, goal.target_amount);
                const monthsRemaining = goal.target_date ? getMonthsRemaining(goal.target_date) : null;
                const requiredMonthly = getRequiredMonthly(goal);
                const GoalIcon = getGoalIcon(goal.goal_type);

                return (
                  <Card key={goal.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <GoalIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{goal.name}</CardTitle>
                            <CardDescription className="text-xs capitalize">
                              {goal.goal_type.replace('_', ' ')}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge className={priorityColors[goal.priority]}>{goal.priority}</Badge>
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
                          <span className="text-muted-foreground">
                            {formatCurrency(goal.current_amount)}
                          </span>
                          <span className="font-medium">{formatCurrency(goal.target_amount)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-3 rounded-lg bg-muted">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>Time Left</span>
                          </div>
                          <p className="font-medium mt-1">
                            {monthsRemaining !== null
                              ? monthsRemaining > 0
                                ? `${monthsRemaining} months`
                                : 'Overdue'
                              : 'No deadline'}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Banknote className="h-3 w-3" />
                            <span>Need/Month</span>
                          </div>
                          <p className="font-medium mt-1">
                            {requiredMonthly > 0 ? formatCurrency(requiredMonthly) : '-'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(goal)}
                        >
                          Details
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePauseResume(goal)}
                            title="Pause goal"
                          >
                            <PauseCircle className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(goal)}>
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
        </TabsContent>

        <TabsContent value="achieved" className="space-y-4">
          {achievedGoals.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No Achieved Goals Yet"
              description="Keep working towards your goals!"
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {achievedGoals.map((goal) => {
                const GoalIcon = getGoalIcon(goal.goal_type);
                return (
                  <Card key={goal.id} className="border-green-500/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-green-500/10">
                            <GoalIcon className="h-5 w-5 text-green-500" />
                          </div>
                          <CardTitle className="text-lg">{goal.name}</CardTitle>
                        </div>
                        <Badge className="bg-green-500/10 text-green-600">Achieved</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-4">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{formatCurrency(goal.target_amount)}</p>
                        <p className="text-sm text-muted-foreground">Goal completed!</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="paused" className="space-y-4">
          {pausedGoals.length === 0 ? (
            <EmptyState icon={PauseCircle} title="No Paused Goals" description="All your goals are active!" />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pausedGoals.map((goal) => {
                const progress = getProgressPercentage(goal.current_amount, goal.target_amount);
                const GoalIcon = getGoalIcon(goal.goal_type);

                return (
                  <Card key={goal.id} className="opacity-75">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <GoalIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <CardTitle className="text-lg">{goal.name}</CardTitle>
                        </div>
                        <Badge variant="secondary">Paused</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Progress value={progress} className="h-2" />
                        <div className="flex justify-between text-sm mt-2">
                          <span>{formatCurrency(goal.current_amount)}</span>
                          <span>{formatCurrency(goal.target_amount)}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handlePauseResume(goal)}
                      >
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Resume Goal
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Goal Detail Sheet */}
      <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedGoal && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedGoal.name}</SheetTitle>
                <SheetDescription className="capitalize">
                  {selectedGoal.goal_type.replace('_', ' ')} Goal
                </SheetDescription>
              </SheetHeader>

              {isLoadingDetail ? (
                <div className="space-y-6 mt-6">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6 mt-6">
                  {/* Progress */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span className="font-medium">
                        {getProgressPercentage(
                          selectedGoal.current_amount,
                          selectedGoal.target_amount
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <Progress
                      value={getProgressPercentage(
                        selectedGoal.current_amount,
                        selectedGoal.target_amount
                      )}
                      className="h-3"
                    />
                    <div className="flex justify-between text-sm mt-2 text-muted-foreground">
                      <span>{formatCurrency(selectedGoal.current_amount)}</span>
                      <span>{formatCurrency(selectedGoal.target_amount)}</span>
                    </div>
                  </div>

                  {/* Projection Card */}
                  {projection && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <LineChart className="h-4 w-4" />
                          Projection
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Avg Monthly Contribution</span>
                          <span className="font-medium">
                            {formatCurrency(projection.average_monthly_contribution)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Projected Completion</span>
                          <span className="font-medium">
                            {projection.projected_completion_date
                              ? format(parseISO(projection.projected_completion_date), 'MMM yyyy')
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Target Date</span>
                          <span className="font-medium">
                            {selectedGoal.target_date
                              ? format(parseISO(selectedGoal.target_date), 'MMM yyyy')
                              : 'No deadline'}
                          </span>
                        </div>
                        <div
                          className={cn(
                            'p-3 rounded-lg text-sm',
                            projection.on_track
                              ? 'bg-green-500/10 text-green-700'
                              : 'bg-yellow-500/10 text-yellow-700'
                          )}
                        >
                          {projection.on_track ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              <span>On track to achieve goal!</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              <span>
                                {Math.abs(projection.months_behind_or_ahead)} months behind schedule
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Add Contribution */}
                  <Button className="w-full" onClick={() => setIsContributionDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Contribution
                  </Button>

                  {/* Contribution History */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Contribution History
                    </h4>
                    {contributions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No contributions yet
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {contributions.slice(0, 10).map((contrib) => (
                          <div
                            key={contrib.id}
                            className="flex justify-between items-center p-3 rounded-lg bg-muted"
                          >
                            <div>
                              <p className="font-medium">{formatCurrency(contrib.amount)}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(parseISO(contrib.contribution_date), 'MMM d, yyyy')}
                                {contrib.source && ` • ${contrib.source}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleMarkAchieved(selectedGoal)}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark Achieved
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handlePauseResume(selectedGoal)}
                    >
                      {selectedGoal.status === 'paused' ? (
                        <>
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Resume
                        </>
                      ) : (
                        <>
                          <PauseCircle className="mr-2 h-4 w-4" />
                          Pause
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Contribution Dialog */}
      <Dialog open={isContributionDialogOpen} onOpenChange={setIsContributionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contribution</DialogTitle>
            <DialogDescription>Record a contribution to your goal</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount (PKR)</Label>
              <Input
                type="number"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                placeholder="10000"
              />
            </div>
            <div className="space-y-2">
              <Label>Source (Optional)</Label>
              <Input
                value={contributionSource}
                onChange={(e) => setContributionSource(e.target.value)}
                placeholder="e.g., Monthly salary, Bonus"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={contributionNotes}
                onChange={(e) => setContributionNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsContributionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddContribution} disabled={!contributionAmount || isAddingContribution}>
              {isAddingContribution ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add Contribution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suggestion Dialog */}
      <Dialog open={isSuggestionDialogOpen} onOpenChange={setIsSuggestionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Monthly Contribution Suggestions</DialogTitle>
            <DialogDescription>
              Based on your target of {formData.target_amount && formatCurrency(parseFloat(formData.target_amount))} by{' '}
              {formData.target_date && format(new Date(formData.target_date), 'MMM yyyy')}
            </DialogDescription>
          </DialogHeader>
          {suggestion && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg border-2 border-primary bg-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Required Amount</p>
                    <p className="text-sm text-muted-foreground">To meet your goal exactly</p>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(suggestion.required_monthly)}</p>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Comfortable Pace</p>
                    <p className="text-sm text-muted-foreground">Takes a bit longer</p>
                  </div>
                  <p className="text-xl font-semibold">{formatCurrency(suggestion.comfortable_monthly)}</p>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Aggressive Pace</p>
                    <p className="text-sm text-muted-foreground">Reach goal faster</p>
                  </div>
                  <p className="text-xl font-semibold">{formatCurrency(suggestion.aggressive_monthly)}</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                {suggestion.months_remaining} months remaining until target date
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsSuggestionDialogOpen(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
