let token: string | null = null;

export function setAuthToken(next: string | null) {
  token = next;
}

export function getAuthToken() {
  return token;
}
