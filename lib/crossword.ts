// Crossword Generator - automatically places words in a grid

export interface CrosswordClue {
  number: number;
  clue: string;
  answer: string;
  direction: "across" | "down";
  row?: number;
  col?: number;
}

export interface CrosswordGrid {
  grid: Array<Array<string | null>>;
  clues: Array<{
    number: number;
    clue: string;
    answer: string;
    direction: "across" | "down";
    row: number;
    col: number;
  }>;
  gridSize: number;
}

export class CrosswordGenerator {
  private grid: Array<Array<string | null>>;
  private gridSize: number;
  private placedClues: Array<{
    number: number;
    clue: string;
    answer: string;
    direction: "across" | "down";
    row: number;
    col: number;
  }> = [];

  constructor(gridSize: number = 15) {
    this.gridSize = gridSize;
    this.grid = Array(gridSize)
      .fill(null)
      .map(() => Array(gridSize).fill(null));
  }

  // Find intersection points between two words
  private findIntersections(
    word1: string,
    word2: string
  ): Array<{ pos1: number; pos2: number; letter: string }> {
    const intersections: Array<{ pos1: number; pos2: number; letter: string }> =
      [];
    for (let i = 0; i < word1.length; i++) {
      for (let j = 0; j < word2.length; j++) {
        if (word1[i] === word2[j]) {
          intersections.push({ pos1: i, pos2: j, letter: word1[i] });
        }
      }
    }
    return intersections;
  }

  // Check if a word can be placed at a position
  private canPlaceWord(
    word: string,
    row: number,
    col: number,
    direction: "across" | "down"
  ): boolean {
    // Check bounds first
    if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) {
      return false;
    }

    // Check if starting position is valid according to direction rules:
    // - Across: MUST have no cell on the LEFT (Trái → Phải) - STRICT RULE
    // - Down: MUST have no cell on the TOP (Trên → Dưới) - STRICT RULE
    // NO EXCEPTIONS - even for intersections, the starting position must follow the rule
    if (direction === "across") {
      // For across words: MUST have empty space on the LEFT
      // Rule: Trái → Phải (Left → Right) - STRICT, NO EXCEPTIONS
      const leftEmpty = col === 0 || this.grid[row]?.[col - 1] === null;

      if (!leftEmpty) {
        // Left side has a cell - this is INVALID, reject immediately
        // Rule must be followed strictly: Across words must start where left is empty
        return false;
      }
      // Only valid if left is empty

      if (col + word.length > this.gridSize) return false;
      for (let i = 0; i < word.length; i++) {
        if (col + i >= this.gridSize) return false;
        const cell = this.grid[row]?.[col + i];
        if (cell !== null && cell !== undefined && cell !== word[i]) {
          return false;
        }
      }
    } else {
      // For down words: MUST have empty space on the TOP
      // Rule: Trên → Dưới (Top → Bottom) - STRICT, NO EXCEPTIONS
      const topEmpty = row === 0 || this.grid[row - 1]?.[col] === null;

      if (!topEmpty) {
        // Top side has a cell - this is INVALID, reject immediately
        // Rule must be followed strictly: Down words must start where top is empty
        return false;
      }
      // Only valid if top is empty

      if (row + word.length > this.gridSize) return false;
      for (let i = 0; i < word.length; i++) {
        if (row + i >= this.gridSize) return false;
        const cell = this.grid[row + i]?.[col];
        if (cell !== null && cell !== undefined && cell !== word[i]) {
          return false;
        }
      }
    }
    return true;
  }

  // Place a word at a position
  private placeWord(
    word: string,
    row: number,
    col: number,
    direction: "across" | "down"
  ): void {
    if (direction === "across") {
      for (let i = 0; i < word.length; i++) {
        if (
          row >= 0 &&
          row < this.gridSize &&
          col + i >= 0 &&
          col + i < this.gridSize
        ) {
          this.grid[row][col + i] = word[i];
        }
      }
    } else {
      for (let i = 0; i < word.length; i++) {
        if (
          row + i >= 0 &&
          row + i < this.gridSize &&
          col >= 0 &&
          col < this.gridSize
        ) {
          this.grid[row + i][col] = word[i];
        }
      }
    }
  }

  // Calculate minimum distance to all placed words
  private getMinDistanceToPlacedWords(
    row: number,
    col: number,
    direction: "across" | "down",
    wordLength: number
  ): number {
    let minDist = Infinity;
    for (const placedClue of this.placedClues) {
      const placedCenterRow =
        placedClue.direction === "across"
          ? placedClue.row
          : placedClue.row + Math.floor(placedClue.answer.length / 2);
      const placedCenterCol =
        placedClue.direction === "across"
          ? placedClue.col + Math.floor(placedClue.answer.length / 2)
          : placedClue.col;

      const newCenterRow =
        direction === "across" ? row : row + Math.floor(wordLength / 2);
      const newCenterCol =
        direction === "across" ? col + Math.floor(wordLength / 2) : col;

      const distance = Math.sqrt(
        Math.pow(newCenterRow - placedCenterRow, 2) +
          Math.pow(newCenterCol - placedCenterCol, 2)
      );
      minDist = Math.min(minDist, distance);
    }
    return minDist;
  }

  // Calculate how well distributed the word would be (spread out score)
  private getDistributionScore(
    row: number,
    col: number,
    direction: "across" | "down",
    wordLength: number
  ): number {
    if (this.placedClues.length === 0) return 0;

    // Calculate average distance to all placed words
    let totalDist = 0;
    let count = 0;
    for (const placedClue of this.placedClues) {
      const placedCenterRow =
        placedClue.direction === "across"
          ? placedClue.row
          : placedClue.row + Math.floor(placedClue.answer.length / 2);
      const placedCenterCol =
        placedClue.direction === "across"
          ? placedClue.col + Math.floor(placedClue.answer.length / 2)
          : placedClue.col;

      const newCenterRow =
        direction === "across" ? row : row + Math.floor(wordLength / 2);
      const newCenterCol =
        direction === "across" ? col + Math.floor(wordLength / 2) : col;

      const distance = Math.sqrt(
        Math.pow(newCenterRow - placedCenterRow, 2) +
          Math.pow(newCenterCol - placedCenterCol, 2)
      );
      totalDist += distance;
      count++;
    }

    const avgDist = totalDist / count;
    // Prefer positions that are moderately far from existing words (better distribution)
    // Ideal distance is around 6-10 cells for good spread
    if (avgDist >= 6 && avgDist <= 10) {
      return 30; // Best distribution
    } else if (avgDist >= 4 && avgDist < 6) {
      return 15; // Good distribution
    } else if (avgDist > 10 && avgDist <= 15) {
      return 20; // Acceptable, slightly far
    } else if (avgDist >= 2 && avgDist < 4) {
      return 5; // Too close, but acceptable
    } else {
      return 0; // Too close or too far
    }
  }

  // Calculate potential intersection score with placed words
  private getPotentialIntersectionScore(
    word: string,
    row: number,
    col: number,
    direction: "across" | "down"
  ): number {
    let score = 0;
    for (const placedClue of this.placedClues) {
      const placedWord = placedClue.answer.toUpperCase();

      // Check if this word could potentially intersect with placed word
      if (direction !== placedClue.direction) {
        // Different directions - potential for intersection
        if (direction === "across" && placedClue.direction === "down") {
          // Check if any letter in new word matches any letter in placed word
          for (let i = 0; i < word.length; i++) {
            const newRow = row;
            const newCol = col + i;
            // Check if this position could intersect with placed word
            if (
              newRow >= placedClue.row &&
              newRow < placedClue.row + placedWord.length &&
              newCol === placedClue.col
            ) {
              const placedIndex = newRow - placedClue.row;
              if (word[i] === placedWord[placedIndex]) {
                score += 10; // Potential intersection found
              }
            }
          }
        } else {
          // direction === "down" && placedClue.direction === "across"
          for (let i = 0; i < word.length; i++) {
            const newRow = row + i;
            const newCol = col;
            // Check if this position could intersect with placed word
            if (
              newCol >= placedClue.col &&
              newCol < placedClue.col + placedWord.length &&
              newRow === placedClue.row
            ) {
              const placedIndex = newCol - placedClue.col;
              if (word[i] === placedWord[placedIndex]) {
                score += 10; // Potential intersection found
              }
            }
          }
        }
      }
    }
    return score;
  }

  // Check if word is too close to existing words (overlapping or adjacent)
  private isTooClose(
    word: string,
    row: number,
    col: number,
    direction: "across" | "down"
  ): boolean {
    for (const placedClue of this.placedClues) {
      if (direction === "across" && placedClue.direction === "across") {
        // Same direction - check if too close horizontally
        if (row === placedClue.row) {
          const distance = Math.min(
            Math.abs(col - placedClue.col),
            Math.abs(
              col + word.length - placedClue.col - placedClue.answer.length
            )
          );
          if (distance < 2) return true; // Too close
        }
      } else if (direction === "down" && placedClue.direction === "down") {
        // Same direction - check if too close vertically
        if (col === placedClue.col) {
          const distance = Math.min(
            Math.abs(row - placedClue.row),
            Math.abs(
              row + word.length - placedClue.row - placedClue.answer.length
            )
          );
          if (distance < 2) return true; // Too close
        }
      }
    }
    return false;
  }

  // Generate crossword from clues
  generate(clues: CrosswordClue[]): CrosswordGrid {
    // Try multiple times to get the best layout
    let bestResult: CrosswordGrid | null = null;
    let bestScore = -1;

    // Increase attempts for better layouts - more attempts to find connected layout
    const maxAttempts = Math.max(80, clues.length * 8);
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Reset grid
      this.grid = Array(this.gridSize)
        .fill(null)
        .map(() => Array(this.gridSize).fill(null));
      this.placedClues = [];

      // Sort clues by length (longer words first) and direction, with some randomization
      const sortedClues = [...clues].sort((a, b) => {
        if (a.answer.length !== b.answer.length) {
          return b.answer.length - a.answer.length;
        }
        // Add some randomness for different layouts
        if (attempt > 0) {
          return Math.random() > 0.5 ? 1 : -1;
        }
        return a.direction === "across" ? -1 : 1;
      });

      // Place first word at edge/corner (not in center)
      // Ensure left, top, or bottom has no cells
      if (sortedClues.length > 0) {
        const firstClue = sortedClues[0];
        const firstWord = firstClue.answer.toUpperCase();

        if (firstClue.direction === "across") {
          // For across words, place at top-left or top edge
          // Row 0 ensures no cells above, Col 0 ensures no cells to the left
          const startRow = 0;
          const startCol = 0;
          this.placeWord(firstWord, startRow, startCol, "across");
          this.placedClues.push({
            number: firstClue.number,
            clue: firstClue.clue,
            answer: firstClue.answer,
            direction: "across",
            row: startRow,
            col: startCol,
          });
        } else {
          // For down words, place at top-left or left edge
          // Row 0 ensures no cells above, Col 0 ensures no cells to the left
          const startRow = 0;
          const startCol = 0;
          this.placeWord(firstWord, startRow, startCol, "down");
          this.placedClues.push({
            number: firstClue.number,
            clue: firstClue.clue,
            answer: firstClue.answer,
            direction: "down",
            row: startRow,
            col: startCol,
          });
        }
      }

      // Place remaining words
      for (let i = 1; i < sortedClues.length; i++) {
        const clue = sortedClues[i];
        const word = clue.answer.toUpperCase();
        let placed = false;

        // Try to intersect with already placed words (preferred)
        for (const placedClue of this.placedClues) {
          const placedWord = placedClue.answer.toUpperCase();
          const intersections = this.findIntersections(word, placedWord);

          for (const intersection of intersections) {
            let newRow: number, newCol: number;

            if (
              clue.direction === "across" &&
              placedClue.direction === "down"
            ) {
              // New word is across, placed word is down
              // Calculate intersection point
              const intersectRow = placedClue.row + intersection.pos2;
              const intersectCol = placedClue.col;

              // Calculate starting position: go left from intersection by pos1
              newRow = intersectRow;
              newCol = intersectCol - intersection.pos1;

              // STRICT RULE: Across must have no cell on the LEFT
              // Check if left is empty (must be empty, no exceptions)
              const leftEmpty =
                newCol === 0 || this.grid[newRow]?.[newCol - 1] === null;

              if (
                leftEmpty &&
                newCol >= 0 &&
                newCol + word.length <= this.gridSize &&
                this.canPlaceWord(word, newRow, newCol, "across")
              ) {
                this.placeWord(word, newRow, newCol, "across");
                this.placedClues.push({
                  number: clue.number,
                  clue: clue.clue,
                  answer: clue.answer,
                  direction: "across",
                  row: newRow,
                  col: newCol,
                });
                placed = true;
                break;
              }
            } else if (
              clue.direction === "down" &&
              placedClue.direction === "across"
            ) {
              // New word is down, placed word is across
              // Calculate intersection point
              const intersectRow = placedClue.row;
              const intersectCol = placedClue.col + intersection.pos2;

              // Calculate starting position: go up from intersection by pos1
              newRow = intersectRow - intersection.pos1;
              newCol = intersectCol;

              // STRICT RULE: Down must have no cell on the TOP
              // Check if top is empty (must be empty, no exceptions)
              const topEmpty =
                newRow === 0 || this.grid[newRow - 1]?.[newCol] === null;

              if (
                topEmpty &&
                newRow >= 0 &&
                newRow + word.length <= this.gridSize &&
                this.canPlaceWord(word, newRow, newCol, "down")
              ) {
                this.placeWord(word, newRow, newCol, "down");
                this.placedClues.push({
                  number: clue.number,
                  clue: clue.clue,
                  answer: clue.answer,
                  direction: "down",
                  row: newRow,
                  col: newCol,
                });
                placed = true;
                break;
              }
            }
          }

          if (placed) break;
        }

        // If couldn't intersect, find best position that can connect to existing words
        // STRICT: All words (except first) MUST connect to at least one existing word
        if (!placed) {
          let bestPosition: { row: number; col: number; score: number } | null =
            null;

          // Search entire grid for best position
          for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
              if (clue.direction === "across") {
                if (col + word.length > this.gridSize) continue;
                if (!this.canPlaceWord(word, row, col, "across")) continue;

                // STRICT: Check if this position can connect to existing words
                // A word connects if it either shares a matching letter OR is adjacent (touching orthogonally) to any placed letter.
                let canConnectMatching = false;
                let canConnectAdjacent = false;
                for (let i = 0; i < word.length; i++) {
                  const checkRow = row;
                  const checkCol = col + i;
                  const existingCell = this.grid[checkRow]?.[checkCol];
                  if (existingCell !== null && existingCell === word[i]) {
                    canConnectMatching = true;
                  }
                  // Check adjacent orthogonal cells for connectivity
                  if (
                    this.grid[checkRow - 1]?.[checkCol] !== null ||
                    this.grid[checkRow + 1]?.[checkCol] !== null ||
                    this.grid[checkRow]?.[checkCol - 1] !== null ||
                    this.grid[checkRow]?.[checkCol + 1] !== null
                  ) {
                    canConnectAdjacent = true;
                  }
                }

                // STRICT RULE: Only place if it can connect (matching or adjacent) after the first word
                if (
                  this.placedClues.length > 0 &&
                  !canConnectMatching &&
                  !canConnectAdjacent
                )
                  continue;

                if (this.isTooClose(word, row, col, "across")) continue;

                const minDist = this.getMinDistanceToPlacedWords(
                  row,
                  col,
                  "across",
                  word.length
                );
                const intersectionScore = this.getPotentialIntersectionScore(
                  word,
                  row,
                  col,
                  "across"
                );
                const distributionScore = this.getDistributionScore(
                  row,
                  col,
                  "across",
                  word.length
                );

                // Calculate composite score
                let score = 0;

                // Distribution scoring - prioritize spreading words out
                score += distributionScore;

                // Minimum distance scoring - avoid too close
                if (minDist < 2) {
                  score -= 50; // Too close, penalize heavily
                } else if (minDist >= 2 && minDist < 4) {
                  score -= 10; // Still too close
                } else if (minDist >= 4 && minDist <= 8) {
                  score += 10; // Good minimum distance
                }

                // Intersection / connectivity scoring - favor matching letters most, then adjacency
                if (canConnectMatching) {
                  score += intersectionScore * 2;
                  score += 40; // Bonus for exact letter connection (reduced from 60)
                } else if (canConnectAdjacent) {
                  score += intersectionScore;
                  score += 15; // Bonus for adjacency connection (reduced from 25)
                } else {
                  score += intersectionScore;
                }

                // Prefer positions that fill empty areas of the grid
                // Check how many cells around this position are empty
                let emptyNeighbors = 0;
                for (let dr = -2; dr <= 2; dr++) {
                  for (let dc = -2; dc <= 2; dc++) {
                    const checkRow = row + dr;
                    const checkCol = col + dc;
                    if (
                      checkRow >= 0 &&
                      checkRow < this.gridSize &&
                      checkCol >= 0 &&
                      checkCol < this.gridSize &&
                      this.grid[checkRow][checkCol] === null
                    ) {
                      emptyNeighbors++;
                    }
                  }
                }
                // Bonus for positions in less crowded areas
                if (emptyNeighbors >= 15) {
                  score += 15; // Good spread area
                } else if (emptyNeighbors >= 10) {
                  score += 8; // Acceptable area
                }

                if (!bestPosition || score > bestPosition.score) {
                  bestPosition = { row, col, score };
                }
              } else {
                if (row + word.length > this.gridSize) continue;
                if (!this.canPlaceWord(word, row, col, "down")) continue;

                // STRICT: Check if this position can connect to existing words
                // A word connects if it either shares a matching letter OR is adjacent (touching orthogonally) to any placed letter.
                let canConnectMatching = false;
                let canConnectAdjacent = false;
                for (let i = 0; i < word.length; i++) {
                  const checkRow = row + i;
                  const checkCol = col;
                  const existingCell = this.grid[checkRow]?.[checkCol];
                  if (existingCell !== null && existingCell === word[i]) {
                    canConnectMatching = true;
                  }
                  // Check adjacent orthogonal cells for connectivity
                  if (
                    this.grid[checkRow - 1]?.[checkCol] !== null ||
                    this.grid[checkRow + 1]?.[checkCol] !== null ||
                    this.grid[checkRow]?.[checkCol - 1] !== null ||
                    this.grid[checkRow]?.[checkCol + 1] !== null
                  ) {
                    canConnectAdjacent = true;
                  }
                }

                // STRICT RULE: Only place if it can connect (matching or adjacent) after the first word
                if (
                  this.placedClues.length > 0 &&
                  !canConnectMatching &&
                  !canConnectAdjacent
                )
                  continue;

                if (this.isTooClose(word, row, col, "down")) continue;

                const minDist = this.getMinDistanceToPlacedWords(
                  row,
                  col,
                  "down",
                  word.length
                );
                const intersectionScore = this.getPotentialIntersectionScore(
                  word,
                  row,
                  col,
                  "down"
                );
                const distributionScore = this.getDistributionScore(
                  row,
                  col,
                  "down",
                  word.length
                );

                // Calculate composite score
                let score = 0;

                // Distribution scoring - prioritize spreading words out
                score += distributionScore;

                // Minimum distance scoring - avoid too close
                if (minDist < 2) {
                  score -= 50; // Too close, penalize heavily
                } else if (minDist >= 2 && minDist < 4) {
                  score -= 10; // Still too close
                } else if (minDist >= 4 && minDist <= 8) {
                  score += 10; // Good minimum distance
                }

                // Intersection / connectivity scoring - favor matching letters most, then adjacency
                if (canConnectMatching) {
                  score += intersectionScore * 2;
                  score += 40; // Bonus for exact letter connection (reduced from 60)
                } else if (canConnectAdjacent) {
                  score += intersectionScore;
                  score += 15; // Bonus for adjacency connection (reduced from 25)
                } else {
                  score += intersectionScore;
                }

                // Prefer positions that fill empty areas of the grid
                // Check how many cells around this position are empty
                let emptyNeighbors = 0;
                for (let dr = -2; dr <= 2; dr++) {
                  for (let dc = -2; dc <= 2; dc++) {
                    const checkRow = row + dr;
                    const checkCol = col + dc;
                    if (
                      checkRow >= 0 &&
                      checkRow < this.gridSize &&
                      checkCol >= 0 &&
                      checkCol < this.gridSize &&
                      this.grid[checkRow][checkCol] === null
                    ) {
                      emptyNeighbors++;
                    }
                  }
                }
                // Bonus for positions in less crowded areas
                if (emptyNeighbors >= 15) {
                  score += 15; // Good spread area
                } else if (emptyNeighbors >= 10) {
                  score += 8; // Acceptable area
                }

                if (!bestPosition || score > bestPosition.score) {
                  bestPosition = { row, col, score };
                }
              }
            }
          }

          // STRICT: Only place if we found a position that can connect
          if (bestPosition && bestPosition.score > -10) {
            // Double check connection (safety check)
            let canConnectMatching = false;
            let canConnectAdjacent = false;
            if (clue.direction === "across") {
              for (let i = 0; i < word.length; i++) {
                const checkRow = bestPosition.row;
                const checkCol = bestPosition.col + i;
                const existingCell = this.grid[checkRow]?.[checkCol];
                if (existingCell !== null && existingCell === word[i]) {
                  canConnectMatching = true;
                }
                if (
                  this.grid[checkRow - 1]?.[checkCol] !== null ||
                  this.grid[checkRow + 1]?.[checkCol] !== null ||
                  this.grid[checkRow]?.[checkCol - 1] !== null ||
                  this.grid[checkRow]?.[checkCol + 1] !== null
                ) {
                  canConnectAdjacent = true;
                }
              }
            } else {
              for (let i = 0; i < word.length; i++) {
                const checkRow = bestPosition.row + i;
                const checkCol = bestPosition.col;
                const existingCell = this.grid[checkRow]?.[checkCol];
                if (existingCell !== null && existingCell === word[i]) {
                  canConnectMatching = true;
                }
                if (
                  this.grid[checkRow - 1]?.[checkCol] !== null ||
                  this.grid[checkRow + 1]?.[checkCol] !== null ||
                  this.grid[checkRow]?.[checkCol - 1] !== null ||
                  this.grid[checkRow]?.[checkCol + 1] !== null
                ) {
                  canConnectAdjacent = true;
                }
              }
            }

            const canConnect = canConnectMatching || canConnectAdjacent;

            // STRICT: Only place if it can connect (no exceptions)
            if (canConnect) {
              this.placeWord(
                word,
                bestPosition.row,
                bestPosition.col,
                clue.direction
              );
              this.placedClues.push({
                number: clue.number,
                clue: clue.clue,
                answer: clue.answer,
                direction: clue.direction,
                row: bestPosition.row,
                col: bestPosition.col,
              });
            }
            // If canConnect is false, don't place - word will be skipped for this attempt
          }
        }
      }

      // Calculate score for this layout (more placed words = better, more intersections = better)
      const placedCount = this.placedClues.length;

      // Count actual intersections
      let intersectionCount = 0;
      for (let i = 0; i < this.placedClues.length; i++) {
        for (let j = i + 1; j < this.placedClues.length; j++) {
          const clue1 = this.placedClues[i];
          const clue2 = this.placedClues[j];

          // Check if clues intersect (must be different directions)
          if (clue1.direction !== clue2.direction) {
            if (clue1.direction === "across" && clue2.direction === "down") {
              // clue1 is across, clue2 is down
              // Check if clue2's row is within clue1's row, and clue2's col is within clue1's column range
              if (
                clue2.row === clue1.row &&
                clue2.col >= clue1.col &&
                clue2.col < clue1.col + clue1.answer.length
              ) {
                // Also check if clue1's letter at that position matches clue2's starting letter
                const clue1Letter =
                  clue1.answer[clue2.col - clue1.col]?.toUpperCase();
                const clue2Letter = clue2.answer[0]?.toUpperCase();
                if (clue1Letter === clue2Letter) {
                  intersectionCount++;
                }
              }
            } else {
              // clue1 is down, clue2 is across
              // Check if clue1's col is within clue2's col, and clue1's row is within clue2's row range
              if (
                clue1.col === clue2.col &&
                clue1.row >= clue2.row &&
                clue1.row < clue2.row + clue2.answer.length
              ) {
                // Also check if clue2's letter at that position matches clue1's starting letter
                const clue2Letter =
                  clue2.answer[clue1.row - clue2.row]?.toUpperCase();
                const clue1Letter = clue1.answer[0]?.toUpperCase();
                if (clue1Letter === clue2Letter) {
                  intersectionCount++;
                }
              }
            }
          }
        }
      }

      // Calculate score: prioritize placed words, intersections, and good distribution
      const score =
        placedCount * 20 + intersectionCount * 15 + (placedCount > 0 ? 10 : 0);

      if (score > bestScore) {
        bestScore = score;
        bestResult = {
          grid: this.grid.map((row) => [...row]),
          clues: [...this.placedClues],
          gridSize: this.gridSize,
        };
      }
    }

    // Return best result or current result if no best found
    return (
      bestResult || {
        grid: this.grid,
        clues: this.placedClues,
        gridSize: this.gridSize,
      }
    );
  }
}
