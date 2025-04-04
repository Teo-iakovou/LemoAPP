import React, { useState, useEffect } from "react";
import Select from "react-select";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  fetchCustomers,
  fetchWaitingList,
  addToWaitingList,
  removeFromWaitingList,
  updateWaitingListNote,
} from "../utils/api";

export default function WaitingList() {
  const [customers, setCustomers] = useState([]);
  const [waitingList, setWaitingList] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingList, setIsFetchingList] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadCustomers();
    loadWaitingList();
  }, []);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const data = await fetchCustomers();
      const formattedCustomers = data.map((customer) => ({
        value: customer._id,
        label: `${customer.name} - ${customer.phoneNumber}`,
      }));
      setCustomers(formattedCustomers);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWaitingList = async () => {
    setIsFetchingList(true);
    try {
      const data = await fetchWaitingList();
      setWaitingList(data);
    } catch (error) {
      console.error("Failed to fetch waiting list:", error);
    } finally {
      setIsFetchingList(false);
    }
  };

  const handleAddToWaitingList = async () => {
    if (!selectedCustomer) {
      alert("Please select a customer.");
      return;
    }

    setIsAdding(true);
    try {
      const addedCustomer = await addToWaitingList(selectedCustomer.value);
      setWaitingList((prev) => [...prev, addedCustomer]);
      setSelectedCustomer(null);
    } catch (error) {
      console.error("Failed to add to waiting list:", error);
      alert("Failed to add customer to the waiting list. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveFromWaitingList = async (id) => {
    setIsDeleting(true);
    try {
      await removeFromWaitingList(id);
      setWaitingList((prev) => prev.filter((entry) => entry._id !== id));
    } catch (error) {
      console.error("Failed to remove from waiting list:", error);
      alert(
        "Failed to remove customer from the waiting list. Please try again."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleNoteChange = (id, newNote) => {
    setWaitingList((prev) =>
      prev.map((entry) =>
        entry._id === id ? { ...entry, note: newNote } : entry
      )
    );
  };

  const handleNoteSave = async (id) => {
    const noteToSave = waitingList.find((entry) => entry._id === id)?.note;
    if (noteToSave === undefined) return;

    try {
      await updateWaitingListNote(id, { note: noteToSave });
    } catch (error) {
      console.error("Failed to save note:", error);
      alert("Failed to save note. Please try again.");
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Λίστα Αναμονής</h2>

      {isLoading ? (
        <Skeleton
          count={1}
          height={50}
          className="mb-6"
          style={{ borderRadius: "8px" }}
        />
      ) : (
        <div className="mb-6">
          <Select
            options={customers}
            value={selectedCustomer}
            onChange={setSelectedCustomer}
            placeholder="Αναζήτηση Πελάτη"
            isClearable
            isSearchable
            styles={{
              control: (base) => ({
                ...base,
                backgroundColor: "#1e293b",
                borderColor: "#3b82f6",
                color: "white",
                borderRadius: "8px",
                padding: "5px",
                fontSize: "14px",
              }),
              menu: (base) => ({
                ...base,
                backgroundColor: "#1e293b",
                color: "white",
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isFocused ? "#3b82f6" : "#1e293b",
                color: "white",
              }),
              singleValue: (base) => ({
                ...base,
                color: "white",
              }),
              placeholder: (base) => ({
                ...base,
                color: "#9ca3af",
              }),
              input: (base) => ({
                ...base,
                color: "white",
              }),
            }}
          />

          <button
            onClick={handleAddToWaitingList}
            disabled={isAdding}
            className={`${
              isAdding ? "bg-gray-600" : "bg-blue-500 hover:bg-blue-600"
            } text-white px-4 py-2 rounded mt-4`}
          >
            {isAdding ? "Προσθήκη..." : "Προσθήκη"}
          </button>
        </div>
      )}

      {isFetchingList ? (
        <Skeleton
          count={5}
          height={60}
          className="mb-4"
          style={{ borderRadius: "8px" }}
        />
      ) : (
        <div
          className="space-y-4 overflow-y-auto"
          style={{
            maxHeight: "300px",
          }}
        >
          <ul className="space-y-4">
            {waitingList.map((entry) => (
              <li
                key={entry._id}
                className="p-4 bg-gray-800 rounded flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold">{entry.customerId.name}</p>
                  <p className="text-sm text-gray-400">
                    {entry.customerId.phoneNumber}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <input
                    type="text"
                    value={entry.note || ""}
                    onChange={(e) =>
                      handleNoteChange(entry._id, e.target.value)
                    }
                    onBlur={() => handleNoteSave(entry._id)} // Save note on blur
                    placeholder="Προσθέστε σημείωση..."
                    className="p-2 rounded bg-gray-700 text-white"
                  />
                </div>
                <button
                  onClick={() => handleRemoveFromWaitingList(entry._id)}
                  disabled={isDeleting}
                  className={`${
                    isDeleting ? "bg-gray-600" : "bg-red-500 hover:bg-red-600"
                  } text-white px-3 py-1 rounded`}
                >
                  {isDeleting ? "Αφαίρεση..." : "Αφαίρεση"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
