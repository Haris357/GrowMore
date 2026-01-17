'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Target,
  Shield,
  TrendingUp,
  Briefcase,
  Loader2,
  Sparkles,
  AlertCircle,
  Clock,
  DollarSign,
  PiggyBank,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  question: string;
  options: {
    value: string;
    label: string;
    points: number;
  }[];
}

interface RiskProfile {
  id: string;
  name: string;
  description: string;
  typical_allocation: Record<string, string>;
  suitable_for: string;
}

interface Sector {
  id: string;
  name: string;
}

interface AssetType {
  id: string;
  name: string;
  risk: string;
}

type Step = 'welcome' | 'risk-assessment' | 'preferences' | 'goals' | 'review' | 'complete';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Risk assessment state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Options state
  const [riskProfiles, setRiskProfiles] = useState<RiskProfile[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [goalOptions, setGoalOptions] = useState<string[]>([]);

  // Profile state
  const [riskResult, setRiskResult] = useState<{
    total_points: number;
    risk_profile: string;
    description: string;
  } | null>(null);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<string[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [monthlyCapacity, setMonthlyCapacity] = useState<string>('');
  const [experienceLevel, setExperienceLevel] = useState<string>('beginner');
  const [investmentHorizon, setInvestmentHorizon] = useState<string>('medium_term');

  // Check if user already has a profile
  useEffect(() => {
    checkExistingProfile();
    fetchOptions();
  }, []);

  const checkExistingProfile = async () => {
    try {
      const response = await api.get('/personalization/profile');
      if (response.data.profile) {
        // User already has a profile, redirect to dashboard
        router.push('/dashboard');
      }
    } catch (error) {
      // No profile exists, continue with onboarding
    }
  };

  const fetchOptions = async () => {
    try {
      const [questionsRes, profilesRes, sectorsRes, assetsRes, goalsRes] = await Promise.all([
        api.get('/personalization/risk-assessment'),
        api.get('/personalization/options/risk-profiles'),
        api.get('/personalization/options/sectors'),
        api.get('/personalization/options/asset-types'),
        api.get('/personalization/options/goals'),
      ]);

      setQuestions(questionsRes.data.questions || []);
      setRiskProfiles(profilesRes.data.profiles || []);
      setSectors(sectorsRes.data.sectors || []);
      setAssetTypes(assetsRes.data.asset_types || []);
      setGoalOptions(goalsRes.data.goals || []);
    } catch (error) {
      console.error('Failed to fetch options:', error);
    }
  };

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      submitRiskAssessment();
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const submitRiskAssessment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const formattedAnswers = Object.entries(answers).map(([question_id, answer]) => ({
        question_id,
        answer,
      }));

      const response = await api.post('/personalization/risk-assessment', {
        answers: formattedAnswers,
      });

      setRiskResult(response.data);
      setStep('preferences');
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to submit risk assessment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSectorToggle = (sectorId: string) => {
    setSelectedSectors((prev) =>
      prev.includes(sectorId) ? prev.filter((s) => s !== sectorId) : [...prev, sectorId]
    );
  };

  const handleAssetTypeToggle = (assetId: string) => {
    setSelectedAssetTypes((prev) =>
      prev.includes(assetId) ? prev.filter((a) => a !== assetId) : [...prev, assetId]
    );
  };

  const handleGoalToggle = (goal: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const submitProfile = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await api.put('/personalization/profile', {
        risk_profile: riskResult?.risk_profile || 'moderate',
        experience_level: experienceLevel,
        investment_horizon: investmentHorizon,
        preferred_sectors: selectedSectors,
        preferred_asset_types: selectedAssetTypes,
        financial_goals: selectedGoals,
        monthly_investment_capacity: monthlyCapacity ? parseFloat(monthlyCapacity) : null,
      });

      setStep('complete');
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  const getProgressPercentage = () => {
    const steps: Step[] = ['welcome', 'risk-assessment', 'preferences', 'goals', 'review', 'complete'];
    const currentIndex = steps.indexOf(step);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  const getRiskProfileColor = (profile: string) => {
    switch (profile) {
      case 'conservative':
        return 'text-blue-500 bg-blue-500/10';
      case 'moderate':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'aggressive':
        return 'text-red-500 bg-red-500/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getRiskIcon = (profile: string) => {
    switch (profile) {
      case 'conservative':
        return Shield;
      case 'moderate':
        return Target;
      case 'aggressive':
        return TrendingUp;
      default:
        return Target;
    }
  };

  // Welcome Step
  if (step === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to GrowMore!</CardTitle>
            <CardDescription className="text-base">
              Let&apos;s personalize your investment experience. This quick setup will help us
              provide recommendations tailored to your financial goals and risk tolerance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-medium">Risk Assessment</h4>
                  <p className="text-sm text-muted-foreground">
                    Answer 7 quick questions to determine your risk profile
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                  <Briefcase className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h4 className="font-medium">Investment Preferences</h4>
                  <p className="text-sm text-muted-foreground">
                    Select your preferred sectors and asset types
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                  <Target className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <h4 className="font-medium">Financial Goals</h4>
                  <p className="text-sm text-muted-foreground">
                    Tell us about your investment goals and timeline
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Takes about 3-5 minutes</span>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => router.push('/dashboard')}>
                Skip for Now
              </Button>
              <Button className="flex-1" onClick={() => setStep('risk-assessment')}>
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Risk Assessment Step
  if (step === 'risk-assessment') {
    const currentQuestion = questions[currentQuestionIndex];
    const questionProgress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline">Risk Assessment</Badge>
              <span className="text-sm text-muted-foreground">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
            </div>
            <Progress value={questionProgress} className="h-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            {currentQuestion && (
              <>
                <div>
                  <h3 className="text-xl font-semibold mb-4">{currentQuestion.question}</h3>
                  <RadioGroup
                    value={answers[currentQuestion.id] || ''}
                    onValueChange={(value) => handleAnswerSelect(currentQuestion.id, value)}
                    className="space-y-3"
                  >
                    {currentQuestion.options.map((option) => (
                      <div
                        key={option.value}
                        className={cn(
                          'flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors',
                          answers[currentQuestion.id] === option.value
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        )}
                        onClick={() => handleAnswerSelect(currentQuestion.id, option.value)}
                      >
                        <RadioGroupItem value={option.value} id={option.value} />
                        <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePrevQuestion}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    onClick={handleNextQuestion}
                    disabled={!answers[currentQuestion.id] || isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : currentQuestionIndex === questions.length - 1 ? (
                      'See Results'
                    ) : (
                      <>
                        Next
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Preferences Step
  if (step === 'preferences') {
    const RiskIcon = riskResult ? getRiskIcon(riskResult.risk_profile) : Target;

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-3xl w-full">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline">Investment Preferences</Badge>
              <Progress value={getProgressPercentage()} className="w-32 h-2" />
            </div>
            <CardTitle>Your Risk Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Risk Result Display */}
            {riskResult && (
              <div
                className={cn(
                  'p-6 rounded-lg border-2',
                  getRiskProfileColor(riskResult.risk_profile)
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-white/50 flex items-center justify-center">
                    <RiskIcon className="h-7 w-7" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold capitalize">
                        {riskResult.risk_profile} Investor
                      </h3>
                      <Badge variant="secondary">{riskResult.total_points} points</Badge>
                    </div>
                    <p className="text-sm opacity-80">{riskResult.description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Experience Level */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Investment Experience</Label>
              <RadioGroup
                value={experienceLevel}
                onValueChange={setExperienceLevel}
                className="grid grid-cols-2 gap-3"
              >
                {[
                  { value: 'beginner', label: 'Beginner', desc: 'Just starting out' },
                  { value: 'intermediate', label: 'Intermediate', desc: 'Some experience' },
                  { value: 'advanced', label: 'Advanced', desc: 'Several years' },
                  { value: 'expert', label: 'Expert', desc: 'Professional level' },
                ].map((exp) => (
                  <div
                    key={exp.value}
                    className={cn(
                      'flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors',
                      experienceLevel === exp.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    )}
                    onClick={() => setExperienceLevel(exp.value)}
                  >
                    <RadioGroupItem value={exp.value} id={`exp-${exp.value}`} />
                    <Label htmlFor={`exp-${exp.value}`} className="cursor-pointer">
                      <div className="font-medium">{exp.label}</div>
                      <div className="text-xs text-muted-foreground">{exp.desc}</div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Investment Horizon */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Investment Horizon</Label>
              <RadioGroup
                value={investmentHorizon}
                onValueChange={setInvestmentHorizon}
                className="grid grid-cols-3 gap-3"
              >
                {[
                  { value: 'short_term', label: 'Short Term', desc: '< 2 years' },
                  { value: 'medium_term', label: 'Medium Term', desc: '2-5 years' },
                  { value: 'long_term', label: 'Long Term', desc: '5+ years' },
                ].map((horizon) => (
                  <div
                    key={horizon.value}
                    className={cn(
                      'flex flex-col items-center rounded-lg border p-4 cursor-pointer transition-colors text-center',
                      investmentHorizon === horizon.value
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    )}
                    onClick={() => setInvestmentHorizon(horizon.value)}
                  >
                    <RadioGroupItem value={horizon.value} id={`horizon-${horizon.value}`} className="sr-only" />
                    <div className="font-medium">{horizon.label}</div>
                    <div className="text-xs text-muted-foreground">{horizon.desc}</div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Preferred Sectors */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                Preferred Sectors <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {sectors.map((sector) => (
                  <Badge
                    key={sector.id}
                    variant={selectedSectors.includes(sector.id) ? 'default' : 'outline'}
                    className="cursor-pointer py-2 px-3"
                    onClick={() => handleSectorToggle(sector.id)}
                  >
                    {sector.name}
                    {selectedSectors.includes(sector.id) && (
                      <CheckCircle className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Asset Types */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                Preferred Asset Types <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {assetTypes.map((asset) => (
                  <div
                    key={asset.id}
                    className={cn(
                      'flex items-center space-x-2 rounded-lg border p-3 cursor-pointer transition-colors',
                      selectedAssetTypes.includes(asset.id)
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    )}
                    onClick={() => handleAssetTypeToggle(asset.id)}
                  >
                    <Checkbox
                      checked={selectedAssetTypes.includes(asset.id)}
                      onCheckedChange={() => handleAssetTypeToggle(asset.id)}
                    />
                    <div>
                      <div className="text-sm font-medium">{asset.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        Risk: {asset.risk.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep('risk-assessment')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setStep('goals')}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Goals Step
  if (step === 'goals') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline">Financial Goals</Badge>
              <Progress value={getProgressPercentage()} className="w-32 h-2" />
            </div>
            <CardTitle>What are your financial goals?</CardTitle>
            <CardDescription>
              Select all goals that apply to help us provide better recommendations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Goals Selection */}
            <div className="grid grid-cols-2 gap-3">
              {goalOptions.map((goal) => (
                <div
                  key={goal}
                  className={cn(
                    'flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors',
                    selectedGoals.includes(goal) ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  )}
                  onClick={() => handleGoalToggle(goal)}
                >
                  <Checkbox
                    checked={selectedGoals.includes(goal)}
                    onCheckedChange={() => handleGoalToggle(goal)}
                  />
                  <Label className="cursor-pointer text-sm">{goal}</Label>
                </div>
              ))}
            </div>

            {/* Monthly Investment Capacity */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                Monthly Investment Capacity{' '}
                <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="e.g., 50000"
                  value={monthlyCapacity}
                  onChange={(e) => setMonthlyCapacity(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                How much can you invest monthly? (in PKR)
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep('preferences')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setStep('review')}>
                Review Profile
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Review Step
  if (step === 'review') {
    const RiskIcon = riskResult ? getRiskIcon(riskResult.risk_profile) : Target;

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline">Review</Badge>
              <Progress value={getProgressPercentage()} className="w-32 h-2" />
            </div>
            <CardTitle>Review Your Profile</CardTitle>
            <CardDescription>
              Make sure everything looks correct before saving
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Risk Profile Summary */}
            {riskResult && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Risk Profile</Label>
                <div
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-lg',
                    getRiskProfileColor(riskResult.risk_profile)
                  )}
                >
                  <RiskIcon className="h-6 w-6" />
                  <div>
                    <span className="font-semibold capitalize">{riskResult.risk_profile}</span>
                    <span className="text-sm ml-2 opacity-80">({riskResult.total_points} points)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Experience & Horizon */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Experience Level</Label>
                <div className="p-3 rounded-lg bg-muted capitalize">{experienceLevel}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Investment Horizon</Label>
                <div className="p-3 rounded-lg bg-muted capitalize">
                  {investmentHorizon.replace('_', ' ')}
                </div>
              </div>
            </div>

            {/* Preferred Sectors */}
            {selectedSectors.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Preferred Sectors</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedSectors.map((sectorId) => {
                    const sector = sectors.find((s) => s.id === sectorId);
                    return (
                      <Badge key={sectorId} variant="secondary">
                        {sector?.name || sectorId}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Preferred Asset Types */}
            {selectedAssetTypes.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Preferred Asset Types</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedAssetTypes.map((assetId) => {
                    const asset = assetTypes.find((a) => a.id === assetId);
                    return (
                      <Badge key={assetId} variant="secondary">
                        {asset?.name || assetId}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Financial Goals */}
            {selectedGoals.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Financial Goals</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedGoals.map((goal) => (
                    <Badge key={goal} variant="secondary">
                      {goal}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly Capacity */}
            {monthlyCapacity && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Monthly Investment Capacity</Label>
                <div className="p-3 rounded-lg bg-muted flex items-center gap-2">
                  <PiggyBank className="h-4 w-4 text-muted-foreground" />
                  PKR {parseInt(monthlyCapacity).toLocaleString()}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep('goals')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={submitProfile} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Save Profile
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Complete Step
  if (step === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <CardTitle className="text-2xl">You&apos;re All Set!</CardTitle>
            <CardDescription className="text-base">
              Your investment profile has been created. We&apos;ll now provide personalized
              recommendations based on your preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 text-left">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <Target className="h-5 w-5 text-primary" />
                <span>Personalized stock recommendations</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span>Tailored investment strategies</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <Briefcase className="h-5 w-5 text-primary" />
                <span>Relevant market news and updates</span>
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={() => router.push('/dashboard')}>
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
