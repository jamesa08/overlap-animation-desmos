from typing import List, Tuple
from dataclasses import dataclass

@dataclass
class Keyframe:
    frame: float
    value: float

    def __repr__(self):
        return f"({self.frame}, {self.value})"
    
    def __hash__(self):
        return hash((self.frame, self.value))

# for handling adding keyframes together
def findOverlap(keyList1: List[Keyframe], keyList2: List[Keyframe]) -> List[Keyframe]:
    """finds the overlap between two sets of keylists 
    for this to work, the second keylist must be bigger than the first keylist

    :param List[Keyframe] keyList1: first keylist
    :param List[Keyframe] keyList2: second keylist
    :raises ValueError: if the first keylist's first frame is bigger than the second keylist's first frame
    :return List[Keyframe]: the list of keyframes that are overlapping
    """
    if len(keyList1) == 0 or len(keyList2) == 0:
        return []
    
    if keyList1[0].frame > keyList2[0].frame:
        # this means a note is somehow going back in time? is this even possible?
        # notes should always be sequential, and not in reverse time
        raise ValueError("first keyframe in keyList1 is bigger than first keyframe in keyList2! Please open a issue on GitHub along with the MIDI file.")
    
    overlappingKeyList = []
    overlapping = False
    for key1 in reversed(keyList1):
        if key1.frame > keyList2[0].frame:
            overlapping = True
            overlappingKeyList.append(key1)
        else:
            # not overlapping
            if overlapping:
                overlappingKeyList.append(key1)
            break

    return list(reversed(overlappingKeyList))

# for handling adding keyframes together
def getValue(key1: Keyframe, key2: Keyframe, frame: float) -> float:
    """this interpolates 2 keyframes to get a intermediate value

    :param Keyframe key1: first keyframe
    :param Keyframe key2: second keyframe
    :param float frame: the frame to evaluate
    :return float: the evaluated value at the given frame
    """
    x1, y1 = key1.frame, key1.value
    x2, y2 = key2.frame, key2.value    
    try:
        m = (y2 - y1) / (x2 - x1)
    except ZeroDivisionError:
        # i dont know if this will work every time
        m = 0
    
    c = y1 - m * x1
    return (m * frame) + c

# for handling adding keyframes together
def interval(keyList, frame) -> Tuple[Keyframe]:
    """returns the interval keyframes back given a frame number
    e.g., if you had a keyList of 
    [
        Keyframe(frame=0.0, value=0.0), 
        Keyframe(frame=10.0, value=1.0), 
        Keyframe(frame=20.0, value=0.0)
    ]
    and you wanted to know the interval at frame 12.0
    the function would return
    (Keyframe(frame=10.0, value=1.0), Keyframe(frame=20.0, value=0.0))

    :param List[Keyframes] keyList: the list of keyframes to check
    :param float frame: the frame to check the interval between
    :return Tuple[Keyframe]: the keyframes that are within that interval
    """
    if len(keyList) == 0: 
        return (None, None)
    if keyList[0].frame > frame:
        # out of range to the left of the list
        return (keyList[0], keyList[0])
    elif keyList[-1].frame < frame:
        # out of range to the right of the list
        return (keyList[-1], keyList[-1])
    
    for i in range(len(keyList) - 1):
        if keyList[i].frame <= frame <= keyList[i+1].frame:
            return (keyList[i], keyList[i+1])

def addKeyframes(insertedKeys: List[Keyframe], nextKeys: List[Keyframe]) -> None:
    """adds the two lists of keyframes together.
    check out the desmos graph to learn a bit more on how this works
    https://www.desmos.com/calculator/t7ullcvosp
    this is a mutating function
    
    :param List[Keyframe] insertedKeys: the keyframes that are already inserted on the object
    :param List[Keyframe] nextKeys: the keyframes that will be inserted next (the upcoming note)
    :raises ValueError: if the `insertedKeys'` first frame is bigger than `nextKeys'` first frame
    :return None: this function mutates the insertedKeys list
    """

    keysOverlapping = findOverlap(insertedKeys, nextKeys)

    insertedKeysInterpolatedValues = []
    nextKeysInterpolatedValues = []

    # interpolate the keyframes for each set of keyframes
    for key in nextKeys:
        inv1, inv2 = interval(keysOverlapping, key.frame)
        if inv1 is None and inv2 is None: continue
        nextKeysInterpolatedValues.append(Keyframe(key.frame, getValue(inv1, inv2, key.frame)))

    for key in keysOverlapping:
        inv1, inv2 = interval(nextKeys, key.frame)
        if inv1 is None and inv2 is None: continue
        insertedKeysInterpolatedValues.append(Keyframe(key.frame, getValue(inv1, inv2, key.frame)))

    # now add the keyframe values together (the most important part)
    for key, interp in zip(keysOverlapping, insertedKeysInterpolatedValues):
        key.value += interp.value

    for key, interp in zip(nextKeys, nextKeysInterpolatedValues):
        key.value += interp.value

    # print(keysOverlapping)
    # print(insertedKeysInterpolatedValues)
    # print(nextKeys)
    # print(nextKeysInterpolatedValues)
    # print(insertedKeys)
    
    
    # trying this out, instead of appending keysOverlapping which (i think) is already in insertedKeys
    insertedKeys.extend(nextKeys)
    insertedKeys.sort(key=lambda keyframe: keyframe.frame)



def main():
    # create some keyframes
    
    # origKeys = [Keyframe(0,0),Keyframe(1,5),Keyframe(2,5),Keyframe(3,0)]
    
    vals = [(0,0),(15,5),(18,5),(33,0)]
    origKeys = []
    for (k, v) in vals:
        origKeys.append(Keyframe(k, v))

    # delta = 1.4
    delta = 9
    
    # add delta to each keyframe
    newKeys = [] 
    for key in origKeys:
        newKeys.append(Keyframe(key.frame + delta, key.value))

    # now run the addKeyframes function
    print(origKeys)
    print(newKeys)
    print()
    addKeyframes(origKeys, newKeys)

    print(origKeys)

if __name__ == "__main__":
    main()

