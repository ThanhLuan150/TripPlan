// Public profile of another account (GET /user/:id/profile), with the follow state of the signed-in user.
export interface CommunityUser {
  id: string;
  fullname: string;
  image?: string;
  backgroundImage?: string;
  experience: number;
  // the signed-in user looking at their own profile: no Follow button
  isSelf: boolean;
  following: boolean;
  followersCount: number;
  followingCount: number;
}

// Answer of POST / DELETE /user/:id/follow
export interface FollowState {
  message: string;
  following: boolean;
  followersCount: number;
  followingCount: number;
}
