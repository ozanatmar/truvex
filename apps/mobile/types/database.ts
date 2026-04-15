export type SubscriptionTier = 'free' | 'starter' | 'pro';
export type MemberType = 'manager' | 'worker';
export type MemberStatus = 'pending' | 'active';
export type CalloutStatus = 'open' | 'pending_selection' | 'filled' | 'cancelled' | 'expired';
export type ResponseType = 'accepted' | 'declined';
export type NotificationChannel = 'push' | 'sms';
export type NotificationType =
  | 'callout_posted'
  | 'selection_needed'
  | 'selected'
  | 'not_selected'
  | 'shift_filled'
  | 'shift_cancelled'
  | 'no_response_escalation';
export type AssignedBy = 'manager' | 'auto';

export interface Profile {
  id: string;
  phone: string;
  name: string | null;
  expo_push_token: string | null;
  created_at: string;
}

export interface Location {
  id: string;
  name: string;
  industry_type: string;
  manager_id: string;
  subscription_tier: SubscriptionTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
}

export interface LocationMember {
  id: string;
  location_id: string;
  user_id: string;
  member_type: MemberType;
  status: MemberStatus;
  is_muted: boolean;
  invited_by: string | null;
  created_at: string;
}

export interface Role {
  id: string;
  location_id: string;
  name: string;
  created_at: string;
}

export interface WorkerRole {
  id: string;
  location_id: string;
  user_id: string;
  role_id: string;
  is_primary: boolean;
}

export interface Callout {
  id: string;
  location_id: string;
  manager_id: string;
  role_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  status: CalloutStatus;
  open_to_all_roles: boolean;
  first_accepted_at: string | null;
  auto_assign_at: string | null;
  assigned_worker_id: string | null;
  assigned_at: string | null;
  assigned_by: AssignedBy | null;
  created_at: string;
}

export interface CalloutResponse {
  id: string;
  callout_id: string;
  worker_id: string;
  response: ResponseType;
  responded_at: string;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  callout_id: string | null;
  channel: NotificationChannel;
  type: NotificationType;
  sent_at: string;
  opened_at: string | null;
}

// Joined types for UI
export interface CalloutWithRole extends Callout {
  role: Role;
  location: Location;
}

export interface CalloutWithResponses extends CalloutWithRole {
  responses: (CalloutResponse & { worker: Profile })[];
}

export interface WorkerWithRoles extends Profile {
  member: LocationMember;
  roles: (WorkerRole & { role: Role })[];
}
