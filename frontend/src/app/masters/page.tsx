"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Edit2,
  Trash2,
  Plus,
  Save,
  Loader2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  CloudCog,
} from "lucide-react";

// --- Types ---
type MasterType = "COUNTRY" | "STATE" | "DISTRICT" | "PINCODE";

export default function MasterEntry() {
  const [selectedMaster, setSelectedMaster] = useState<MasterType>("COUNTRY");
  const [loading, setLoading] = useState(false);

  // Data
  const [tableData, setTableData] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    lastPage: 1,
  });

  // Form & Lookups
  const [formData, setFormData] = useState<any>({});
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);

  // Edit State
  const [editId, setEditId] = useState<string | number | null>(null);

  // API URL (Backend Port 2001)
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:2001/api/masters";

  // --- Fetchers ---

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pagination.page.toString() });

      // Cascading filters for the grid view
      if (selectedMaster === "STATE" && formData.country_code)
        params.append("country_code", formData.country_code);
      if (selectedMaster === "DISTRICT" && formData.stateID)
        params.append("stateID", formData.stateID);

      const res = await fetch(`${API_URL}/${selectedMaster}?${params}`);
      const data = await res.json();
      setTableData(data.data || []);
      setPagination((prev) => ({
        ...prev,
        total: data.total || 0,
        lastPage: data.lastPage || 1,
      }));
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  // FIX: Increased limit to 1000 to ensure 'Patna' and other districts are loaded
  const loadLookup = async (
    type: string,
    setter: any,
    parentParam?: string,
    parentValue?: string
  ) => {
    let url = `${API_URL}/${type}?limit=1000`;
    if (parentParam && parentValue) url += `&${parentParam}=${parentValue}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      setter(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // --- Effects ---

  useEffect(() => {
    setFormData({});
    setTableData([]);
    setPagination({ page: 1, total: 0, lastPage: 1 });
    fetchData();

    // Initial Load for dropdowns
    if (selectedMaster !== "COUNTRY") {
      loadLookup("COUNTRY", setCountries);
    }
  }, [selectedMaster]);

  // Cascading Dropdown Listeners
  useEffect(() => {
    if (formData.country_code && selectedMaster !== "COUNTRY") {
      loadLookup("STATE", setStates, "country_code", formData.country_code);
      // Only clear states if we are NOT in edit mode (to prevent wiping existing edit data)
      if (!editId) setStates([]);
    }
  }, [formData.country_code]);

  useEffect(() => {
    if (formData.stateID && ["DISTRICT", "PINCODE"].includes(selectedMaster)) {
      loadLookup("DISTRICT", setDistricts, "stateID", formData.stateID);
    }
  }, [formData.stateID]);

  // --- Handlers ---

  const handleInput = (key: string, val: any) =>
    setFormData((p: any) => ({ ...p, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let res;
      if (editId) {
        // UPDATE MODE
        res = await fetch(`${API_URL}/${selectedMaster}/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      } else {
        // CREATE MODE
        res = await fetch(`${API_URL}/${selectedMaster}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      }

      if (res.ok) {
        alert(editId ? "Updated successfully!" : "Saved successfully!");
        fetchData();
        cancelEdit(); // Reset form

        // Optional: Keep context for faster entry if creating
        if (!editId) {
          setFormData((p: any) => ({
            country_code: p.country_code,
            stateID: p.stateID,
            districtID: p.districtID,
          }));
        }
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.message || "Unknown error"}`);
      }
    } catch (err) {
      alert("Network Error");
    }
  };

  const handleEdit = (row: any) => {
    // 1. Determine ID based on master type
    let id = null;
    if (selectedMaster === "COUNTRY") id = row.country_code;
    else if (selectedMaster === "STATE") id = row.stateid;
    else if (selectedMaster === "DISTRICT") id = row.districtid;
    else if (selectedMaster === "PINCODE") id = row.placeid;

    if (!id) return;
    setEditId(id);

    // 2. Populate Form Data (Normalization)
    // We map the row data to the form fields expected by our inputs/state
    const newForm = {
      ...row,
      stateID: row.stateid, // Map database 'stateid' to form 'stateID'
      districtID: row.districtid,
      stateName: row.state,
      districtName: row.district,
      // Ensure specific fields map correctly
      country: row.country,
      place: row.place,
    };

    setFormData(newForm);

    // 3. Scroll to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (row: any) => {
    let id = null;
    if (selectedMaster === "COUNTRY") id = row.country_code;
    else if (selectedMaster === "STATE") id = row.stateid;
    else if (selectedMaster === "DISTRICT") id = row.districtid;
    else if (selectedMaster === "PINCODE") id = row.placeid;

    if (!id || !confirm("Are you sure you want to delete this record?")) return;

    try {
      const res = await fetch(`${API_URL}/${selectedMaster}/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchData(); // Refresh
      } else {
        const data = await res.json();
        alert(data.message || "Failed to delete");
      }
    } catch (e) {
      alert("Network Error during delete");
    }
  };

  const cancelEdit = () => {
    setEditId(null);
    setFormData({});
  };

  // --- Render Helpers ---

  const renderFormFields = () => {
    return (
      <>
        {/* 1. Country Dropdown */}
        {selectedMaster !== "COUNTRY" && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Country
            </label>
            <div className="relative">
              <select
                className="w-full p-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-blue-500 transition-all appearance-none"
                onChange={(e) => handleInput("country_code", e.target.value)}
                value={formData.country_code || ""}
                required
              >
                <option value="">Select Country...</option>
                {countries.map((c: any) => (
                  <option key={c.country_code} value={c.country_code}>
                    {c.country}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
                ▼
              </div>
            </div>
          </div>
        )}

        {/* 2. State Dropdown */}
        {["DISTRICT", "PINCODE"].includes(selectedMaster) && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              State
            </label>
            <div className="relative">
              <select
                className="w-full p-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-blue-500 transition-all appearance-none disabled:opacity-50"
                onChange={(e) => handleInput("stateID", e.target.value)}
                disabled={!formData.country_code}
                value={formData.stateID || ""}
                required
              >
                <option value="">Select State...</option>
                {states.map((s: any) => (
                  <option key={s.stateid} value={s.stateid}>
                    {s.state}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
                ▼
              </div>
            </div>
          </div>
        )}

        {/* 3. District Dropdown */}
        {selectedMaster === "PINCODE" && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              District
            </label>
            <div className="relative">
              <select
                className="w-full p-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-blue-500 transition-all appearance-none disabled:opacity-50"
                onChange={(e) => handleInput("districtID", e.target.value)}
                disabled={!formData.stateID}
                value={formData.districtID || ""}
                required
              >
                <option value="">Select District...</option>
                {districts.map((d: any) => (
                  <option key={d.districtid} value={d.districtid}>
                    {d.district}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
                ▼
              </div>
            </div>
          </div>
        )}

        {/* 4. Text Inputs */}
        {selectedMaster === "COUNTRY" && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Country Code
            </label>
            <input
              type="text"
              maxLength={2}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. IN"
              onChange={(e) => handleInput("country_code", e.target.value)}
              value={formData.country_code || ""}
              required
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            {selectedMaster === "COUNTRY"
              ? "Country Name"
              : selectedMaster === "STATE"
              ? "State Name"
              : selectedMaster === "DISTRICT"
              ? "District Name"
              : "Post Office Name"}
          </label>
          <input
            type="text"
            className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Type name here..."
            onChange={(e) =>
              handleInput(
                selectedMaster === "COUNTRY"
                  ? "country"
                  : selectedMaster === "STATE"
                  ? "stateName"
                  : selectedMaster === "DISTRICT"
                  ? "districtName"
                  : "place",
                e.target.value
              )
            }
            value={
              formData.country ||
              formData.stateName ||
              formData.districtName ||
              formData.place ||
              ""
            }
            required
          />
        </div>

        {selectedMaster === "PINCODE" && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Pin Code
            </label>
            <input
              type="text"
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) => handleInput("pincode", e.target.value)}
              value={formData.pincode || ""}
              required
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Advisor ID
          </label>
          <input
            type="number"
            className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Optional"
            onChange={(e) => handleInput("advisor", e.target.value)}
            value={formData.advisor || ""}
          />
        </div>
      </>
    );
  };

  const renderTableHeader = () => {
    switch (selectedMaster) {
      case "COUNTRY":
        return (
          <>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider w-24">
              Action
            </th>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
              Country
            </th>
          </>
        );
      case "STATE":
        return (
          <>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider w-24">
              Action
            </th>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
              Country
            </th>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
              State
            </th>
          </>
        );
      case "DISTRICT":
        return (
          <>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider w-24">
              Action
            </th>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
              District
            </th>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
              State
            </th>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
              Country
            </th>
          </>
        );
      case "PINCODE":
        return (
          <>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider w-24">
              Action
            </th>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
              Country
            </th>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
              State
            </th>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
              District
            </th>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
              Pin Code
            </th>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
              Post Office
            </th>
          </>
        );
      default:
        return null;
    }
  };
  const renderTableRows = (row: any) => {
    const actions = (
      <td className="px-6 py-3 flex gap-2">
        <button
          onClick={() => handleEdit(row)}
          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={() => handleDelete(row)}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-all"
        >
          <Trash2 size={14} />
        </button>
      </td>
    );

    switch (selectedMaster) {
      case "COUNTRY":
        return (
          <>
            {actions}
            <td className="px-6 py-3 text-sm font-semibold text-slate-700">
              {row.country}
            </td>
          </>
        );
      case "STATE":
        return (
          <>
            {actions}
            <td className="px-6 py-3 text-sm text-slate-500">
              {row.country_name || row.country_code}
            </td>
            <td className="px-6 py-3 text-sm font-semibold text-slate-700">
              {row.state}
            </td>
          </>
        );
      case "DISTRICT":
        return (
          <>
            {actions}
            <td className="px-6 py-3 text-sm font-semibold text-slate-700">
              {row.district}
            </td>
            <td className="px-6 py-3 text-sm text-slate-500">
              {row.state_name || row.stateid}
            </td>
            <td className="px-6 py-3 text-sm text-slate-500">
              {row.country_name}
            </td>
          </>
        );
      case "PINCODE":
        return (
          <>
            {actions}
            <td className="px-6 py-3 text-sm text-slate-500">
              {row.country_name || row.country_code}
            </td>
            <td className="px-6 py-3 text-sm text-slate-500">
              {row.state_name || row.stateid}
            </td>
            <td className="px-6 py-3 text-sm text-slate-500">
              {row.district_name || row.districtid}
            </td>
            <td className="px-6 py-3 text-sm font-mono text-slate-600">
              {row.pincode}
            </td>
            <td className="px-6 py-3 text-sm font-semibold text-slate-700">
              {row.place}
            </td>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg shadow-lg text-white">
            <LayoutGrid size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Master Tables</h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
              Configuration & Data Entry
            </p>
          </div>
        </div>

        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Active Table:
          </span>
          <select
            value={selectedMaster}
            onChange={(e) => setSelectedMaster(e.target.value as MasterType)}
            className="text-sm font-bold text-blue-700 bg-transparent outline-none cursor-pointer hover:text-blue-800"
          >
            <option value="COUNTRY">Country Master</option>
            <option value="STATE">State Master</option>
            <option value="DISTRICT">District Master</option>
            <option value="PINCODE">Place / Pin Code</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL: Form */}
        <div className="lg:col-span-4 sticky top-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Plus size={16} className="text-blue-600" />
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                Add New Record
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {renderFormFields()}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Save size={18} />
                Save Record
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT PANEL: Data Grid */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col min-h-[600px]">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
              <div className="relative w-full sm:w-72">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Search records..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Records:
                </span>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">
                  {pagination.total}
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>{renderTableHeader()}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
                        <Loader2 className="animate-spin mx-auto text-blue-500 mb-2" />
                        Loading data...
                      </td>
                    </tr>
                  ) : tableData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-20 text-center text-slate-400 italic"
                      >
                        No records found. Add one on the left.
                      </td>
                    </tr>
                  ) : (
                    tableData.map((row: any, i) => (
                      <tr
                        key={i}
                        className="hover:bg-blue-50/50 transition-colors group"
                      >
                        {renderTableRows(row)}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/30">
              <button
                disabled={pagination.page === 1}
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page - 1 }))
                }
                className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-50 text-slate-600"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 flex items-center">
                Page {pagination.page}
              </span>
              <button
                disabled={pagination.page >= pagination.lastPage}
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page + 1 }))
                }
                className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-50 text-slate-600"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
