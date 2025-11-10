import type { ChangeEvent } from "react";
import type { SortOrder, SortCriteria } from "@/types";
import "./SortOrderSelector.css";

interface SortOrderSelectorProps {
  sortOrder: SortOrder;
  sortCriteria: SortCriteria;
  onChange: (order: SortOrder) => void;
  disabled?: boolean;
}

export const SortOrderSelector = ({
  sortOrder,
  sortCriteria,
  onChange,
  disabled = false,
}: SortOrderSelectorProps) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value as SortOrder);
  };

  // For merchantMileage, show 4 options
  if (sortCriteria === "merchantMileage") {
    return (
      <fieldset className="sort-order-selector" disabled={disabled}>
        <label>
          <input
            type="radio"
            name="sortOrder"
            value="desc-asc"
            checked={sortOrder === "desc-asc"}
            onChange={handleChange}
            disabled={disabled}
          />
          <span>High Miles, A-Z</span>
        </label>
        <label>
          <input
            type="radio"
            name="sortOrder"
            value="desc-desc"
            checked={sortOrder === "desc-desc"}
            onChange={handleChange}
            disabled={disabled}
          />
          <span>High Miles, Z-A</span>
        </label>
        <label>
          <input
            type="radio"
            name="sortOrder"
            value="asc-asc"
            checked={sortOrder === "asc-asc"}
            onChange={handleChange}
            disabled={disabled}
          />
          <span>Low Miles, A-Z</span>
        </label>
        <label>
          <input
            type="radio"
            name="sortOrder"
            value="asc-desc"
            checked={sortOrder === "asc-desc"}
            onChange={handleChange}
            disabled={disabled}
          />
          <span>Low Miles, Z-A</span>
        </label>
      </fieldset>
    );
  }

  // For mileage and alphabetical, show 2 options
  const isMileageBased = sortCriteria === "mileage";

  const labels = {
    desc: isMileageBased ? "Highest Miles" : "Z to A",
    asc: isMileageBased ? "Lowest Miles" : "A to Z",
  };

  const firstOption = isMileageBased ? "desc" : "asc";
  const secondOption = isMileageBased ? "asc" : "desc";

  return (
    <fieldset className="sort-order-selector" disabled={disabled}>
      <label>
        <input
          type="radio"
          name="sortOrder"
          value={firstOption}
          checked={sortOrder === firstOption}
          onChange={handleChange}
          disabled={disabled}
        />
        <span>{firstOption === "desc" ? labels.desc : labels.asc}</span>
      </label>
      <label>
        <input
          type="radio"
          name="sortOrder"
          value={secondOption}
          checked={sortOrder === secondOption}
          onChange={handleChange}
          disabled={disabled}
        />
        <span>{secondOption === "desc" ? labels.desc : labels.asc}</span>
      </label>
    </fieldset>
  );
};
