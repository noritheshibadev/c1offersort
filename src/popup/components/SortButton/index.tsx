import React, { useState } from "react";
import { LoadingSpinner } from "../LoadingSpinner";
import "./SortButton.css";

interface SortButtonProps {
  onClick: () => void | Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
}

/**
 * Button component for triggering the sort operation.
 * Loads all offers from all pages, then sorts them according to the selected criteria and order.
 * Displays a loading spinner and "Loading..." text while sorting is in progress.
 * Includes visual feedback with a pressed state animation.
 *
 * @param onClick - Callback function to execute when button is clicked
 * @param isLoading - If true, shows loading state and disables button
 * @param disabled - If true, disables the button
 */
export const SortButton: React.FC<SortButtonProps> = ({
  onClick,
  isLoading,
  disabled = false,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const isDisabled = isLoading || disabled;

  return (
    <button
      className={`sort-button ${isPressed ? "pressed" : ""}`}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={isLoading}
      aria-label={isLoading ? "Loading all offers..." : "Load all offers"}
      onMouseDown={() => !isDisabled && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
    >
      {isLoading ? (
        <div className="sort-button-content">
          <LoadingSpinner />
          <span>Loading...</span>
        </div>
      ) : (
        "Load All Offers"
      )}
    </button>
  );
};
