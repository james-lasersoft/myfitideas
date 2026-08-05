import api from "./api";

export type PreferredDateFormat = "LOCALE" | "MM_DD_YYYY" | "DD_MM_YYYY" | "YYYY_MM_DD";
export type PreferredTimeFormat = "12" | "24";
export type PreferredWeekStart = "SUNDAY" | "MONDAY";

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  heightCm: number | null;
  preferredWeightUnit: "lb" | "kg";
  preferredLengthUnit: "in" | "cm";
  preferredHydrationUnit: "oz" | "ml";
  preferredLanguage: "en" | "pt-BR";
  preferredDateFormat: PreferredDateFormat;
  preferredTimeFormat: PreferredTimeFormat;
  preferredWeekStart: PreferredWeekStart;
  timezone: string;
  dailyHydrationGoal: number;
  dailyHydrationGoalMl: number;
  targetWeight: number | null;
  targetWeightKg: number | null;
  createdAt: string;
  updatedAt: string;
}

export type UpdateProfileInput = Partial<{
  firstName: string;
  lastName: string | null;
  heightCm: number | null;
  preferredWeightUnit: "lb" | "kg";
  preferredLengthUnit: "in" | "cm";
  preferredHydrationUnit: "oz" | "ml";
  preferredLanguage: "en" | "pt-BR";
  preferredDateFormat: PreferredDateFormat;
  preferredTimeFormat: PreferredTimeFormat;
  preferredWeekStart: PreferredWeekStart;
  timezone: string;
  dailyHydrationGoal: number;
  targetWeight: number | null;
}>;

interface ProfileResponse {
  profile: UserProfile;
}

interface UpdateProfileResponse {
  message: string;
  profile: UserProfile;
}

export async function getProfile(): Promise<UserProfile> {
  const response = await api.get<ProfileResponse>("/api/profile");
  return response.data.profile;
}

export async function updateProfile(
  input: UpdateProfileInput
): Promise<UserProfile> {
  const response = await api.put<UpdateProfileResponse>(
    "/api/profile",
    input
  );
  return response.data.profile;
}
