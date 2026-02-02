const BARBER_TEXT_COLOR_MAP = {
  ΛΕΜΟ: "text-purple-600",
  ΦΟΡΟΥ: "text-orange-500",
};

const BARBER_HEX_COLOR_MAP = {
  ΛΕΜΟ: "#6B21A8",
  ΦΟΡΟΥ: "orange",
  ΚΟΥΣΙΗΣ: "#0F766E",
};

export const getBarberTextColorClass = (barberName) =>
  BARBER_TEXT_COLOR_MAP[barberName] || "text-white";

export const getCustomerTextColorClass = (customer) =>
  getBarberTextColorClass(customer?.barber);

export const getBarberHexColor = (barberName) =>
  BARBER_HEX_COLOR_MAP[barberName] || "#9ca3af";

export const getCustomerHexColor = (customer) =>
  getBarberHexColor(customer?.barber);
