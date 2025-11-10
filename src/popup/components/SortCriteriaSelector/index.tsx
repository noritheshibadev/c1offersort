import type { ChangeEvent } from "react";
import type { SortCriteria } from "@/types";
import "./SortCriteriaSelector.css";

interface SortCriteriaSelectorProps {
  sortCriteria: SortCriteria;
  onChange: (criteria: SortCriteria) => void;
  disabled?: boolean;
}

export const SortCriteriaSelector = ({
  sortCriteria,
  onChange,
  disabled = false,
}: SortCriteriaSelectorProps) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value as SortCriteria);
  };

  return (
    <fieldset className="sort-criteria-selector" disabled={disabled}>
      <legend>Sort by:</legend>
      <label>
        <input
          type="radio"
          name="sortCriteria"
          value="mileage"
          checked={sortCriteria === "mileage"}
          onChange={handleChange}
          disabled={disabled}
        />
        <span>Mileage Value</span>
      </label>
      <label>
        <input
          type="radio"
          name="sortCriteria"
          value="alphabetical"
          checked={sortCriteria === "alphabetical"}
          onChange={handleChange}
          disabled={disabled}
        />
        <span>Merchant Name</span>
      </label>
      <label>
        <input
          type="radio"
          name="sortCriteria"
          value="merchantMileage"
          checked={sortCriteria === "merchantMileage"}
          disabled={disabled}
          onChange={handleChange}
        />
        <span>Mileage + Merchant Name</span>
      </label>
    </fieldset>
  );
};
