import React from "react";
import MuscleMap from "@/components/MuscleMap";

const mockMuscleVolumes = {
  חזה: 5000,
  גב: 4000,
  כתפיים: 3000,
  רגליים: 6000,
  "יד קדמית": 2000,
  "יד אחורית": 1500,
  ישבן: 3500,
  בטן: 2500,
  אמות: 1200,
  קרדיו: 800,
  פונקציונלי: 1000,
};

const Test3D = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <MuscleMap muscleVolumes={mockMuscleVolumes} />
    </div>
  );
};

export default Test3D;