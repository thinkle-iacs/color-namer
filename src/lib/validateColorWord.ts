import { Filter } from "bad-words";

const directColorWords = [
  "red",
  "black",
  "white",
  "purple",
  "orange",
  "green",
  "blue",
  "yellow",
  "pink",
  "brown",
  "gray",
  "grey",
  "beige",
  "tan",
  "cyan",
  "magenta",
  "teal",
  "maroon",
  "navy",
  "azure",
  "chartreuse",
  "crimson",
  "fuchsia",
  "indigo",
  "ivory",
  "lavender",
  "mauve",
  "ochre",
  "peach",
  "periwinkle",
  "salmon",
  "sapphire",
  "scarlet",
  "turquoise",
  "vermilion",
  "violet",
  "viridian",
];

const shadeWords = [
  "light",
  "lighter",
  "lightest",
  "dark",
  "darker",
  "darkest",
  "bright",
  "brighter",
  "brightest",
  "pale",
  "paler",
  "palest",
];

export function isInvalid(word: string): string | undefined {
  if (directColorWords.includes(word.toLowerCase())) {
    return "No direct color words allowed!";
  } else if (shadeWords.includes(word.toLowerCase())) {
    return "No simple shading words / comparisons allowed";
  } else if (word.length > 64) {
    return "No more than 64 characters in your color name!";
  }
  for (let w of directColorWords) {
    if (word.includes(w)) {
      return "No direct color words allowed!";
    }
  }
}
