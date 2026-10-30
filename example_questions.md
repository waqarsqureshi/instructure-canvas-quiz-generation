# Example Canvas Classic Question Bank
Format: canvas-md-v1

## mcq | Pinhole projection
```canvas
{
  "type": "multiple_choice",
  "points": 2,
  "choices": [
    {"text": "It doubles.", "correct": false},
    {"text": "It halves.", "correct": true},
    {"text": "It stays unchanged.", "correct": false}
  ]
}
```
### Prompt
A point's depth doubles while its camera-frame X and Y coordinates stay fixed.
What happens to its image offset from the principal point?

### Solution
The offset is proportional to X/Z or Y/Z, so it halves.

## select_many | Rotation properties
```canvas
{
  "type": "multiple_answers",
  "points": 3,
  "choices": [
    {"text": "R transpose times R equals I.", "correct": true},
    {"text": "det(R) = 1.", "correct": true},
    {"text": "Every pair of 3D rotations commutes.", "correct": false}
  ]
}
```
### Prompt
Select **all** properties of a proper 3D rotation matrix.

### Solution
Proper rotation matrices are orthogonal with determinant +1. Rotations do not
generally commute.

## tf | Homogeneous scale
```canvas
{"type": "true_false", "points": 1, "answer": true}
```
### Prompt
The homogeneous points (2, 4, 2) and (1, 2, 1) represent the same Cartesian point.

### Solution
Divide the first two coordinates by the third coordinate.

## short | Name the image displacement
```canvas
{
  "type": "short_answer",
  "points": 1,
  "answers": ["disparity", "stereo disparity"]
}
```
### Prompt
What is the horizontal displacement between corresponding pixels in a rectified stereo pair called?

### Solution
Disparity. Either listed phrase is accepted, without regard to letter case.

## blanks | Camera calibration notation
```canvas
{
  "type": "fill_in_multiple_blanks",
  "points": 2,
  "blanks": {
    "intrinsics": ["K"],
    "rotation": ["R"]
  }
}
```
### Prompt
In the standard projection matrix P = K[R | t], [intrinsics] is the intrinsic
matrix and [rotation] is the rotation matrix.

### Solution
K is intrinsic; R is rotation.

## dropdowns | Stereo relations
```canvas
{
  "type": "multiple_dropdowns",
  "points": 2,
  "blanks": {
    "depth": [
      {"text": "increases", "correct": false},
      {"text": "decreases", "correct": true}
    ],
    "lines": [
      {"text": "horizontal", "correct": true},
      {"text": "vertical", "correct": false}
    ]
  }
}
```
### Prompt
For fixed focal length and baseline, depth [depth] as disparity increases.
In standard horizontal stereo rectification, epipolar lines are [lines].

### Solution
Z = fB/d; epipolar lines are horizontal after rectification.

## matching | Match geometric quantities
```canvas
{
  "type": "matching",
  "points": 3,
  "pairs": [
    {"left": "Essential matrix", "right": "Normalised image coordinates"},
    {"left": "Fundamental matrix", "right": "Pixel coordinates"},
    {"left": "Homography", "right": "Plane-to-image projective mapping"}
  ],
  "distractors": ["A colour histogram"]
}
```
### Prompt
Match each quantity to the best description.

### Solution
E acts on normalised coordinates; F acts on pixels; H maps a plane projectively.

## numeric_exact | Calculate stereo depth
```canvas
{
  "type": "numerical",
  "points": 2,
  "answers": [{"mode": "exact", "value": 5, "tolerance": 0.01}]
}
```
### Prompt
For f = 1000 pixels, B = 0.2 metres, and disparity d = 40 pixels, calculate
Z = fB/d. **Enter metres as a number only**, without the unit.

### Solution
1000 x 0.2 / 40 = 5 m. Accepted interval: 4.99 to 5.01, inclusive.

## numeric_range | Estimate a measurement
```canvas
{
  "type": "numerical",
  "points": 1,
  "answers": [{"mode": "range", "min": 2.9, "max": 3.1}]
}
```
### Prompt
A mapped road width is about 3 m. Enter a width in metres within 0.1 m of this measurement.

### Solution
Any number from 2.9 to 3.1 inclusive is accepted.

## numeric_precision | Significant figures
```canvas
{
  "type": "numerical",
  "points": 1,
  "answers": [{"mode": "precision", "value": 12.3, "figures": 3}]
}
```
### Prompt
Round 12.34 to **three significant figures**.

### Solution
12.3. Canvas interprets precision answers numerically, not as a required number of typed digits.

## formula | Randomised distance calculation
```canvas
{
  "type": "calculated",
  "points": 2,
  "formula": "speed * time",
  "variables": {
    "speed": {"min": 2, "max": 8, "decimals": 0},
    "time": {"min": 1, "max": 5, "decimals": 0}
  },
  "samples": 20,
  "decimal_places": 2,
  "tolerance": 0.01
}
```
### Prompt
An object moves at [speed] metres per second for [time] seconds.
Calculate the distance travelled in metres. Enter a number only.

### Solution
Distance = speed x time. Canvas selects from the generated variable/answer sets.

## essay | Explain inverse mapping
```canvas
{"type": "essay", "points": 4}
```
### Prompt
Explain why pixel distance alone cannot measure road width in metres.
Describe how an inverse homography helps and give one limitation.

### Solution
Perspective scale varies with position. Map both endpoints with the inverse
calibrated plane homography and divide by their homogeneous scales. Compute
Euclidean distance in the plane's metric units. The endpoints must lie in the
calibrated plane; calibration and distortion errors affect accuracy.

## upload | Submit a worked derivation
```canvas
{"type": "file_upload", "points": 5}
```
### Prompt
Upload a PDF containing your derivation of the stereo relation Z = fB/d.
Label the focal length, baseline, disparity and depth on a diagram.

### Solution
Manually check the similar-triangle derivation and the labelled geometry.
The requested PDF format is an instruction, not a file-extension restriction.

## information | End of practice
```canvas
{"type": "text_only", "points": 0}
```
### Prompt
You have reached the end of the practice bank.

- Check your units.
- Check that you divided by the homogeneous scale where required.
- Review any assumptions about planarity and calibration.
