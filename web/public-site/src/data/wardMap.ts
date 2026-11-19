// Suggested link from the 2022 prabhag map (58 areas, used for the map shading and spot wards)
// to the 2026 election prabhags (41). The two maps have different boundaries, so this is matched by
// shared area names only, and the first number is the closest match. Where an area spans several
// prabhags the person picks theirs. Areas with no entry have no confident match.
// Replace with a point-in-polygon lookup once the 2026 prabhag boundary file is available.
export const SUGGEST_2026: Record<number, number[]> = {
  1: [1], 3: [3], 4: [4], 5: [4, 5], 6: [5], 7: [5, 2], 8: [1, 2], 9: [6], 10: [12, 6], 11: [8],
  12: [8, 9], 13: [9], 14: [9, 10], 15: [7], 16: [12, 29], 17: [25, 27], 18: [24, 25], 19: [22, 23],
  20: [13], 21: [14], 22: [15], 23: [15], 24: [16], 25: [16], 26: [17, 18], 27: [22], 28: [25, 26],
  29: [26, 25], 31: [31, 11], 32: [10], 33: [31, 10], 34: [32], 35: [33], 36: [30], 37: [28],
  38: [36], 39: [21], 40: [20], 41: [19], 42: [17], 43: [18, 19], 44: [16, 17], 46: [41], 47: [40],
  48: [39], 49: [38, 20], 50: [36], 51: [35, 34], 52: [35], 53: [33], 54: [34, 38], 55: [37, 38],
  56: [37], 57: [38, 39], 58: [38, 37],
};
