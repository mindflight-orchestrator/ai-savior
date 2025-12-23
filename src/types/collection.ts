/**
 * Collection interface
 * Used to organize conversations into collections
 */
export interface Collection {
  id?: number;
  name: string; // Required, unique
  icon?: string; // Emoji or icon identifier
  color?: string; // Hex color code
  created_at: Date;
}
