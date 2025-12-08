import houseImage from "@assets/house_vector_1764823804103.jpg";

export function HouseSketch({ className, size = "medium" }: { className?: string; size?: "small" | "medium" | "large" }) {
  const sizeClasses = {
    small: "w-16 h-auto",
    medium: "w-24 h-auto", 
    large: "w-40 h-auto"
  };
  
  return (
    <div className={`${sizeClasses[size]} ${className || ""}`}>
      <img 
        src={houseImage} 
        alt="Beauvette" 
        className="w-full h-auto object-contain"
      />
    </div>
  );
}
