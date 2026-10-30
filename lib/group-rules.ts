export function toggleInviteSelection(current: string[], userId: string, maximum = 10) {
  if (current.includes(userId)) return current.filter((id) => id !== userId);
  if (current.length >= maximum) return current;
  return [...current, userId];
}

export function validInviteSelection(selected: string[]) {
  return selected.length >= 1 && selected.length <= 10 && new Set(selected).size === selected.length;
}
