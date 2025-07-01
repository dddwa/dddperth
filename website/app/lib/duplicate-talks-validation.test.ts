import { describe, expect, it } from 'vitest'
import { findDuplicateTalks, hasDuplicateTalks } from '../validate-fairness'

describe('Duplicate talks validation', () => {
    describe('findDuplicateTalks', () => {
        it('should return empty array when no duplicates exist', () => {
            const pairs: Array<[number, number]> = [
                [0, 1],
                [2, 3],
                [4, 5],
            ]
            expect(findDuplicateTalks(pairs)).toEqual([])
        })

        it('should find duplicate talks', () => {
            const pairs: Array<[number, number]> = [
                [0, 1], // talk 0 first time
                [2, 3],
                [0, 4], // talk 0 second time (duplicate)
                [5, 6],
                [1, 7], // talk 1 second time (duplicate)
            ]
            const duplicates = findDuplicateTalks(pairs)
            expect(duplicates.sort()).toEqual([0, 1])
        })

        it('should not report the same duplicate talk multiple times', () => {
            const pairs: Array<[number, number]> = [
                [0, 1], // talk 0 first time
                [0, 2], // talk 0 second time (duplicate)
                [0, 3], // talk 0 third time (duplicate)
                [0, 4], // talk 0 fourth time (duplicate)
            ]
            const duplicates = findDuplicateTalks(pairs)
            expect(duplicates).toEqual([0]) // Only one entry for talk 0, not four
        })

        it('should handle multiple different duplicate talks', () => {
            const pairs: Array<[number, number]> = [
                [0, 1], // first appearance of 0 and 1
                [2, 3], // first appearance of 2 and 3
                [0, 4], // duplicate 0
                [1, 5], // duplicate 1
                [2, 6], // duplicate 2
                [3, 7], // duplicate 3
            ]
            const duplicates = findDuplicateTalks(pairs)
            expect(duplicates.sort()).toEqual([0, 1, 2, 3])
        })

        it('should work with edge cases', () => {
            // Empty array
            expect(findDuplicateTalks([])).toEqual([])
            
            // Single pair
            expect(findDuplicateTalks([[0, 1]])).toEqual([])
        })
    })

    describe('hasDuplicateTalks', () => {
        it('should return false when no duplicates exist', () => {
            const pairs: Array<[number, number]> = [
                [0, 1],
                [2, 3],
                [4, 5],
            ]
            expect(hasDuplicateTalks(pairs)).toBe(false)
        })

        it('should return true when duplicates exist', () => {
            const pairs: Array<[number, number]> = [
                [0, 1],
                [2, 3],
                [0, 4], // duplicate talk 0
            ]
            expect(hasDuplicateTalks(pairs)).toBe(true)
        })

        it('should be consistent with findDuplicateTalks', () => {
            const testCases = [
                [[0, 1], [2, 3], [4, 5]], // no duplicates
                [[0, 1], [0, 2]], // one duplicate
                [[0, 1], [2, 3], [0, 4], [1, 5]], // multiple duplicates
            ] as Array<Array<[number, number]>>

            for (const pairs of testCases) {
                const hasDuplicates = hasDuplicateTalks(pairs)
                const foundDuplicates = findDuplicateTalks(pairs)
                
                if (hasDuplicates) {
                    expect(foundDuplicates.length).toBeGreaterThan(0)
                } else {
                    expect(foundDuplicates.length).toBe(0)
                }
            }
        })
    })
})