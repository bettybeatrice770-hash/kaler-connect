ALTER TYPE public.member_status ADD VALUE IF NOT EXISTS 'left_welfare';
ALTER TYPE public.member_status ADD VALUE IF NOT EXISTS 'suspended';
ALTER TYPE public.contribution_type ADD VALUE IF NOT EXISTS 'fines_penalties';
ALTER TYPE public.contribution_type ADD VALUE IF NOT EXISTS 'advance_subscription';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'branch_rep';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'officer';