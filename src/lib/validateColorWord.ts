import { Filter } from "bad-words";

const directColorWords = [
  "red",
  "black",
  "white",
  "purple",
  "orange",
  "white",
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
}
