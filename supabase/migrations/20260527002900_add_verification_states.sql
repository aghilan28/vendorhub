alter type public.verification_state add value if not exists 'UNDER_REVIEW';
alter type public.verification_state add value if not exists 'EXPIRED';
alter type public.verification_state add value if not exists 'ESCALATION_REQUIRED';
