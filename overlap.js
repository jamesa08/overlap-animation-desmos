function findOverlap(keyList1, keyList2) {
    /**
     * Finds the overlap between two sets of keylists.
     * The second keylist must be larger than the first keylist.
     * 
     * @param {Keyframe[]} keyList1 - The first keylist.
     * @param {Keyframe[]} keyList2 - The second keylist.
     * @returns {Keyframe[]} - The list of overlapping keyframes.
     * @throws {Error} - If the first keyframe in keyList1 is larger than the first keyframe in keyList2.
     */
    if (keyList1.length === 0 || keyList2.length === 0) {
        return [];
    }

    if (keyList1[0].frame > keyList2[0].frame) {
        // this means the note is somehow going back in time?
        // this should never happen
        throw new Error("First keyframe in keyList1 is larger than the first keyframe in keyList2! Please open an issue on GitHub along with the MIDI file.");
    }

    let overlappingKeyList = [];
    let overlapping = false;
    for (let i = keyList1.length - 1; i >= 0; i--) {
        const key1 = keyList1[i];
        if (key1.frame > keyList2[0].frame) {
            overlapping = true;
            overlappingKeyList.push(key1);
        } else {
            if (overlapping) {
                overlappingKeyList.push(key1);
            }
            break;
        }
    }

    return overlappingKeyList.reverse();
}

function getValue(key1, key2, frame) {
    /**
     * Interpolates between two keyframes to get an intermediate value.
     * 
     * @param {Keyframe} key1 - The first keyframe.
     * @param {Keyframe} key2 - The second keyframe.
     * @param {number} frame - The frame to evaluate.
     * @returns {number} - The evaluated value at the given frame.
     */
    const x1 = key1.frame;
    const y1 = key1.value;
    const x2 = key2.frame;
    const y2 = key2.value;

    let m;
    if (x2 !== x1) {
        m = (y2 - y1) / (x2 - x1);
    } else {
        m = 0;
    }

    const c = y1 - m * x1;
    return (m * frame) + c;
}

function interval(keyList, frame) {
    /**
     * Returns the interval keyframes given a frame number.
     * 
     * @param {Keyframe[]} keyList - The list of keyframes to check.
     * @param {number} frame - The frame to check the interval between.
     * @returns {[Keyframe, Keyframe]} - The keyframes that are within that interval.
     */
    if (keyList.length === 0) {
        return [null, null];
    }

    if (keyList[0].frame > frame) {
        return [keyList[0], keyList[0]];
    } else if (keyList[keyList.length - 1].frame < frame) {
        return [keyList[keyList.length - 1], keyList[keyList.length - 1]];
    }

    for (let i = 0; i < keyList.length - 1; i++) {
        if (keyList[i].frame <= frame && frame <= keyList[i + 1].frame) {
            return [keyList[i], keyList[i + 1]];
        }
    }
}


function addKeyframes(insertedKeys, nextKeys) {
    /**
     * Adds two lists of keyframes together, modifying the insertedKeys list.
     * 
     * @param {Keyframe[]} insertedKeys - The keyframes that are already inserted on the object.
     * @param {Keyframe[]} nextKeys - The keyframes that will be inserted next (the upcoming note).
     * @throws {Error} - If the first frame of `insertedKeys` is greater than the first frame of `nextKeys`.
     */
    const keysOverlapping = findOverlap(insertedKeys, nextKeys);

    const insertedKeysInterValues = [];
    const nextKeysInterValues = [];

    // Interpolate the keyframes for each set of keyframes
    for (const key of nextKeys) {
        const [inv1, inv2] = interval(keysOverlapping, key.frame);
        if (inv1 === null && inv2 === null) continue;
        nextKeysInterValues.push(new Keyframe(key.frame, getValue(inv1, inv2, key.frame)));
    }

    for (const key of keysOverlapping) {
        const [inv1, inv2] = interval(nextKeys, key.frame);
        if (inv1 === null && inv2 === null) continue;
        insertedKeysInterValues.push(new Keyframe(key.frame, getValue(inv1, inv2, key.frame)));
    }

    // Add the keyframe values together, zipping the lists essentially
    for (let i = 0; i < keysOverlapping.length; i++) {
        if (insertedKeysInterValues[i] === undefined || keysOverlapping[i] === undefined) {
            break;
        }
        
        keysOverlapping[i].value += insertedKeysInterValues[i].value;
    }

    for (let i = 0; i < nextKeys.length; i++) {
        if (nextKeysInterValues[i] === undefined || nextKeys[i] === undefined) {
            break;
        }
        nextKeys[i].value += nextKeysInterValues[i].value;
    }

    insertedKeys.push(...nextKeys);
    insertedKeys.sort((a, b) => a.frame - b.frame);
    return insertedKeys;
}

function minKeyframes(insertedKeys, nextKeys) {
    /**
     * Compares two lists of keyframes and keeps the minimum values where they overlap.
     * Modifies the insertedKeys list.
     * 
     * @param {Keyframe[]} insertedKeys - The keyframes that are already inserted on the object.
     * @param {Keyframe[]} nextKeys - The keyframes that will be inserted next (the upcoming note).
     */
    const keysOverlapping = findOverlap(insertedKeys, nextKeys);

    const insertedKeysInterValues = [];
    const nextKeysInterValues = [];

    // Interpolate the keyframes for each set of keyframes
    for (const key of nextKeys) {
        const [inv1, inv2] = interval(keysOverlapping, key.frame);
        if (inv1 === null && inv2 === null) continue;
        nextKeysInterValues.push(new Keyframe(key.frame, getValue(inv1, inv2, key.frame)));
    }

    for (const key of keysOverlapping) {
        const [inv1, inv2] = interval(nextKeys, key.frame);
        if (inv1 === null && inv2 === null) continue;
        insertedKeysInterValues.push(new Keyframe(key.frame, getValue(inv1, inv2, key.frame)));
    }

    // Compare the keyframe values and keep the minimum value
    for (let i = 0; i < keysOverlapping.length; i++) {
        const key = keysOverlapping[i];
        const interp = insertedKeysInterValues[i];
        if (interp.value !== 0 && key.value !== 0) {
            console.log(key.value, interp.value);
            key.value = Math.min(key.value, interp.value);
        }
    }

    for (let i = 0; i < nextKeys.length; i++) {
        const key = nextKeys[i];
        const interp = nextKeysInterValues[i];
        if (interp.value !== 0 && key.value !== 0) {
            key.value = Math.min(key.value, interp.value);
        }
    }

    // Extend the lists (insert nextKeys only if they don't already exist in insertedKeys)
    const nonOverlappingKeys = nextKeys.filter(key => !keysOverlapping.some(k => k.frame === key.frame));
    insertedKeys.push(...nonOverlappingKeys);
    insertedKeys.sort((a, b) => a.frame - b.frame);
    return insertedKeys;
}

function maxKeyframes(insertedKeys, nextKeys) {
    /**
     * Compares two lists of keyframes and keeps the maximum values where they overlap.
     * Modifies the insertedKeys list.
     * 
     * @param {Keyframe[]} insertedKeys - The keyframes that are already inserted on the object.
     * @param {Keyframe[]} nextKeys - The keyframes that will be inserted next (the upcoming note).
     */
    const keysOverlapping = findOverlap(insertedKeys, nextKeys);

    const insertedKeysInterValues = [];
    const nextKeysInterValues = [];

    // Interpolate the keyframes for each set of keyframes
    for (const key of nextKeys) {
        const [inv1, inv2] = interval(keysOverlapping, key.frame);
        if (inv1 === null && inv2 === null) continue;
        nextKeysInterValues.push(new Keyframe(key.frame, getValue(inv1, inv2, key.frame)));
    }

    for (const key of keysOverlapping) {
        const [inv1, inv2] = interval(nextKeys, key.frame);
        if (inv1 === null && inv2 === null) continue;
        insertedKeysInterValues.push(new Keyframe(key.frame, getValue(inv1, inv2, key.frame)));
    }

    // Compare the keyframe values and keep the maximum value
    for (let i = 0; i < keysOverlapping.length; i++) {
        if (insertedKeysInterValues[i] === undefined || keysOverlapping[i] === undefined) {
            break;
        }
        const key = keysOverlapping[i];
        const interp = insertedKeysInterValues[i];
        key.value = Math.max(key.value, interp.value);
    }

    for (let i = 0; i < nextKeys.length; i++) {
        if (nextKeysInterValues[i] === undefined || nextKeys[i] === undefined) {
            break;
        }
        const key = nextKeys[i];
        const interp = nextKeysInterValues[i];
        key.value = Math.max(key.value, interp.value);
    }

    // Extend the lists (insert nextKeys only if they don't already exist in insertedKeys)
    const nonOverlappingKeys = nextKeys.filter(key => !keysOverlapping.some(k => k.frame === key.frame));
    insertedKeys.push(...nonOverlappingKeys);
    insertedKeys.sort((a, b) => a.frame - b.frame);

    return insertedKeys;
}

function prevKeyframes(insertedKeys, nextKeys) {
    /**
     * Merges two lists of keyframes, avoiding overlaps.
     * 
     * @param {Keyframe[]} insertedKeys - The list of keyframes that have been inserted.
     * @param {Keyframe[]} nextKeys - The list of keyframes to be potentially added.
     */
    const keysOverlapping = findOverlap(insertedKeys, nextKeys);

    // If there are NO overlapping keyframes, add nextKeys to insertedKeys
    if (keysOverlapping.length === 0) {
        insertedKeys.push(...nextKeys);
    }

    // Sort the keyframes by the frame value
    insertedKeys.sort((a, b) => a.frame - b.frame);
    
    return insertedKeys;
}


function nextKeyframes(insertedKeys, nextKeys) {
    /**
     * Handles the merging of keyframes, removing overlapping keyframes from insertedKeys.
     * 
     * @param {Keyframe[]} insertedKeys - The keyframes that are already inserted on the object.
     * @param {Keyframe[]} nextKeys - The keyframes that will be inserted next (the upcoming note).
     */
    const keysOverlapping = findOverlap(insertedKeys, nextKeys);

    // If there are overlapping keyframes, remove all keyframes in insertedKeys after the first overlap
    if (keysOverlapping.length > 0) {
        const firstOverlapFrame = keysOverlapping[0].frame;

        for (let i = insertedKeys.length - 1; i >= 0; i--) {
            if (insertedKeys[i].frame > firstOverlapFrame) {
                insertedKeys.pop();
            } else {
                break;
            }
        }
    }

    // Extend the insertedKeys with nextKeys and sort them by frame
    insertedKeys.push(...nextKeys);
    insertedKeys.sort((a, b) => a.frame - b.frame);

    return insertedKeys;
}

function restValueCrossingKeyframes(insertedKeys, nextKeys) {
    /**
     * Adjusts keyframe values to smoothly transition through a rest value (0) and merges keyframes.
     * 
     * @param {Keyframe[]} insertedKeys - The keyframes that are already inserted on the object.
     * @param {Keyframe[]} nextKeys - The keyframes that will be inserted next (the upcoming note).
     */
    const restValue = 0;
    const keysOverlapping = findOverlap(insertedKeys, nextKeys);

    for (const key of keysOverlapping) {
        for (const nextKey of nextKeys) {
            if (key.frame === nextKey.frame) {
                // Interpolate the values to cross the rest value (0) smoothly
                const insertedValueToRest = (key.value + restValue) / 2;
                const nextValueFromRest = (nextKey.value + restValue) / 2;

                // Adjust the current keyframe value to fade out to rest value
                key.value = insertedValueToRest;

                // Adjust the next keyframe value to fade in from rest value
                nextKey.value = nextValueFromRest;
            }
        }
    }

    // Identify non-overlapping keyframes in nextKeys
    const overlappingFrames = new Set(keysOverlapping.map(k => k.frame));
    const nonOverlappingNextKeys = nextKeys.filter(key => !overlappingFrames.has(key.frame));

    // Combine non-overlapping nextKeys with insertedKeys
    const finalKeyframes = [];
    let i = 0, j = 0;

    while (i < insertedKeys.length && j < nonOverlappingNextKeys.length) {
        if (insertedKeys[i].frame < nonOverlappingNextKeys[j].frame) {
            finalKeyframes.push(insertedKeys[i]);
            i++;
        } else {
            finalKeyframes.push(nonOverlappingNextKeys[j]);
            j++;
        }
    }

    // Add any remaining keyframes
    finalKeyframes.push(...insertedKeys.slice(i));
    finalKeyframes.push(...nonOverlappingNextKeys.slice(j));

    // Update insertedKeys with final combined keyframes
    insertedKeys.length = 0;
    insertedKeys.push(...finalKeyframes);
    return insertedKeys;
}

function pruneKeyframes(insertedKeys, nextKeys) {
    /**
     * Prunes keyframes by removing overlapping keyframes from the end of insertedKeys
     * and merges with nextKeys, then sorts the result.
     * 
     * @param {Keyframe[]} insertedKeys - The keyframes that are already inserted on the object.
     * @param {Keyframe[]} nextKeys - The keyframes that will be inserted next (the upcoming note).
     */
    const keysOverlapping = findOverlap(insertedKeys, nextKeys);

    let finalKeyframes;

    if (keysOverlapping.length > 0) {
        const lastOverlapFrame = Math.max(...keysOverlapping.map(key => key.frame));

        // Identify keyframes in insertedKeys that overlap and are near the end
        const prunedInsertedKeys = insertedKeys.filter(key => key.frame <= lastOverlapFrame);

        // Remove the last keyframe or two if there's overlap
        if (prunedInsertedKeys.length > 1) {
            prunedInsertedKeys.pop();  // Remove the last overlapping keyframe
            if (prunedInsertedKeys.length > 1) {
                prunedInsertedKeys.pop();  // Optionally remove one more for smoother transition
            }
        }

        // Remaining keyframes
        const remainingInsertedKeys = insertedKeys.filter(key => key.frame > lastOverlapFrame);

        // Final keyframes after pruning
        finalKeyframes = [...prunedInsertedKeys, ...remainingInsertedKeys, ...nextKeys];
    } else {
        // If no overlap, just concatenate the keys
        finalKeyframes = [...insertedKeys, ...nextKeys];
    }

    // Sort and update the insertedKeys with pruned results
    finalKeyframes.sort((a, b) => a.frame - b.frame);
    insertedKeys.length = 0;  // Clear the array
    insertedKeys.push(...finalKeyframes);
    return insertedKeys;
}
