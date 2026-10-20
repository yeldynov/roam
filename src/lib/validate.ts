// Returns the first problem as a message for the auth screens, or null when the form is valid
export function validate(form: { name?: string; email?: string; password?: string }) {
  if (form.name !== undefined && !form.name.trim()) return "Enter your name.";
  if (form.email !== undefined && !/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Enter a valid email address.";
  if (form.password !== undefined && form.password.length < 8) return "Use at least 8 characters for your password.";
  return null;
}
