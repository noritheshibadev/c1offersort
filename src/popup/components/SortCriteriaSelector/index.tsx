import type { ChangeEvent } from "react";
import type { SortCriteria } from "@/types";
import "./SortCriteriaSelector.css";

interface SortCriteriaSelectorProps {
  sortCriteria: SortCriteria;
  onChange: (criteria: SortCriteria) => void;
}

export const SortCriteriaSelector = ({
  sortCriteria,
  onChange,
}: SortCriteriaSelectorProps) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value as SortCriteria);
  };

  return (
    <fieldset className="sort-criteria-selector">
      <legend>Sort:</legend>
      <label>
        <input
          type="radio"
          name="sortCriteria"
          value="mileage"
          checked={sortCriteria === "mileage"}
          onChange={handleChange}
        />
        <span>Mileage</span>
      </label>
      <label>
        <input
          type="radio"
          name="sortCriteria"
          value="alphabetical"
          checked={sortCriteria === "alphabetical"}
          onChange={handleChange}
        />
        <span>Merchant</span>
      </label>
    </fieldset>
  );
};
