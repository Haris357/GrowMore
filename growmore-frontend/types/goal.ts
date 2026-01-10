export interface GoalType {
  id: string;
  name: string;
  icon: string;
  description?: string;
}

export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';
export type GoalStatus = 'active' | 'paused' | 'achieved' | 'abandoned';

export interface Goal {
  id: string;
  user_id: string;
  goal_type_id: string;
  goal_type_name: string;
  goal_type_icon: string;
  name: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  priority: GoalPriority;
  status: GoalStatus;
  portfolio_id?: string;
  created_at: string;
  updated_at: string;
}

export interface GoalWithProgress extends Goal {
  progress_percent: number;
  remaining_amount: number;
  days_remaining?: number;
  is_on_track: boolean;
  suggested_monthly_contribution?: number;
}

export interface Contribution {
  id: string;
  goal_id: string;
  amount: number;
  notes?: string;
  contribution_date: string;
  created_at: string;
}

export interface GoalProgress {
  goal: GoalWithProgress;
  contributions: Contribution[];
  monthly_breakdown: {
    month: string;
    total_contribution: number;
    num_contributions: number;
  }[];
  projection: {
    projected_completion_date?: string;
    projected_final_amount: number;
    is_achievable: boolean;
  };
}

export interface GoalsSummary {
  total_goals: number;
  active_goals: number;
  achieved_goals: number;
  total_target_amount: number;
  total_current_amount: number;
  overall_progress_percent: number;
  on_track_count: number;
  behind_count: number;
}

export interface GoalCreate {
  goal_type_id: string;
  name: string;
  description?: string;
  target_amount: number;
  current_amount?: number;
  target_date?: string;
  priority: GoalPriority;
  portfolio_id?: string;
}

export interface GoalUpdate {
  name?: string;
  description?: string;
  target_amount?: number;
  target_date?: string;
  priority?: GoalPriority;
  portfolio_id?: string;
}

export interface ContributionCreate {
  amount: number;
  notes?: string;
  contribution_date: string;
}
