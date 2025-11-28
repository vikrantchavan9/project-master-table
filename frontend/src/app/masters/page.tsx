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
  Database,
  X,
} from "lucide-react";
import { MASTERS_CONFIG, MasterUIDef } from "./masters.ui.config";

export default function MasterEntry() {
  // Keys from config
  const masterKeys = Object.keys(MASTERS_CONFIG);

  const [selectedMasterKey, setSelectedMasterKey] = useState<string>(
    masterKeys[0]
  );
  const config: MasterUIDef = MASTERS_CONFIG[selectedMasterKey];

  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    lastPage: 1,
  });
  const [formData, setFormData] = useState<any>({});
  const [editId, setEditId] = useState<string | number | null>(null);

  // Store lookup data (e.g., list of Countries for dropdowns)
  const [lookups, setLookups] = useState<Record<string, any[]>>({});

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:2001/api/masters";

  // --- Fetch Data ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: "10",
      });

      // Auto-attach parent filters for table view if they exist in formData
      // (e.g. Filter Grid by selected Country)
      config.fields.forEach((field) => {
        if (field.type === "dropdown" && formData[field.name]) {
          params.append(field.name, formData[field.name]);
        }
      });

      const res = await fetch(`${API_URL}/${selectedMasterKey}?${params}`);
      const data = await res.json();
      setTableData(data.data || []);
      setPagination((prev) => ({
        ...prev,
        total: data.total || 0,
        lastPage: data.lastPage || 1,
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Generic Lookup Loader
  const loadLookup = async (
    masterType: string,
    parentParam?: string,
    parentValue?: string
  ) => {
    // If filtering by parent, always fetch new data. If generic load, check cache.
    if (!parentParam && lookups[masterType] && lookups[masterType].length > 0)
      return;

    try {
      let url = `${API_URL}/${masterType}?limit=1000`;
      if (parentParam && parentValue) {
        url += `&${parentParam}=${parentValue}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setLookups((prev) => ({ ...prev, [masterType]: data.data || [] }));
    } catch (e) {
      console.error(e);
    }
  };

  // --- Effects ---
  useEffect(() => {
    setEditId(null);
    setFormData({});
    setTableData([]);
    setPagination({ page: 1, total: 0, lastPage: 1 });
    fetchData();

    // Pre-load required lookups for this master
    config.fields.forEach((field) => {
      if (field.lookupMaster && !field.parentField) {
        loadLookup(field.lookupMaster);
      }
    });
  }, [selectedMasterKey]);

  // Handle Cascading Dropdowns (Dependent Lookups)
  useEffect(() => {
    config.fields.forEach((field) => {
      // If this field has a parent (e.g., State depends on Country)
      if (field.parentField && field.lookupMaster) {
        const parentValue = formData[field.parentField];
        if (parentValue) {
          // Fetch filtered lookup (e.g., States for IN)
          loadLookup(field.lookupMaster, field.parentField, parentValue);
        } else {
          // Clear if parent is empty
          setLookups((prev) => ({ ...prev, [field.lookupMaster!]: [] }));
        }
      }
    });
  }, [formData.country_code, formData.stateID, config]); // Re-run when context changes

  // --- Handlers ---
  const handleInput = (key: string, val: any) =>
    setFormData((p: any) => ({ ...p, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editId ? "PUT" : "POST";
    const url = editId
      ? `${API_URL}/${selectedMasterKey}/${editId}`
      : `${API_URL}/${selectedMasterKey}`;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        alert("Saved!");
        fetchData();
        if (editId) {
          setEditId(null);
          setFormData({});
        } else {
          // Clear only non-dropdown fields to allow rapid entry
          const clean: any = {};
          config.fields.forEach((f) => {
            if (f.type === "dropdown") clean[f.name] = formData[f.name];
          });
          setFormData(clean);
        }
      } else {
        const err = await res.json();
        alert(err.message);
      }
    } catch (e) {
      alert("Network Error");
    }
  };

  const handleDelete = async (row: any) => {
    if (!confirm("Delete this record?")) return;
    try {
      const res = await fetch(
        `${API_URL}/${selectedMasterKey}/${row[config.pk]}`,
        { method: "DELETE" }
      );
      if (res.ok) fetchData();
    } catch (e) {
      alert("Error deleting");
    }
  };

  const handleEdit = (row: any) => {
    setEditId(row[config.pk]);
    // Map row data to form data.
    // Backend returns 'stateid' (lowercase) usually, but check your generic service response
    // We spread row, then ensure specific lookups match
    setFormData(row);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- Dynamic Rendering ---

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200 p-6 selection:bg-blue-500/30">
      {/* Header & Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/20">
              <Database size={24} className="text-white" />
            </div>
            Master Data
          </h1>
          <p className="text-slate-400 text-sm mt-1 ml-14">
            System Configuration & Management
          </p>
        </div>

        <div className="bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-800 flex items-center gap-3 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Active Table
          </span>
          <div className="h-4 w-px bg-slate-700"></div>
          <select
            value={selectedMasterKey}
            onChange={(e) => setSelectedMasterKey(e.target.value)}
            className="font-semibold text-blue-400 bg-transparent outline-none cursor-pointer hover:text-blue-300 transition-colors text-sm"
          >
            {masterKeys.map((k) => (
              <option key={k} value={k} className="bg-slate-900 text-slate-200">
                {MASTERS_CONFIG[k].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* DYNAMIC FORM (Left Panel) */}
        <div className="lg:col-span-4 sticky top-6">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl shadow-black/20 overflow-hidden">
            {/* Form Header */}
            <div
              className={`px-6 py-4 border-b border-slate-800 flex justify-between items-center ${
                editId ? "bg-yellow-900/10" : "bg-slate-800/50"
              }`}
            >
              <span
                className={`font-bold uppercase text-xs tracking-wider flex items-center gap-2 ${
                  editId ? "text-yellow-500" : "text-blue-400"
                }`}
              >
                {editId ? <Edit2 size={14} /> : <Plus size={14} />}
                {editId ? "Update Record" : "Add New Record"}
              </span>
              {editId && (
                <button
                  onClick={() => {
                    setEditId(null);
                    setFormData({});
                  }}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {config.fields.map((field) => (
                <div key={field.name} className="group">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 group-focus-within:text-blue-400 transition-colors">
                    {field.label}
                    {field.required && (
                      <span className="text-red-400 ml-1">*</span>
                    )}
                  </label>

                  {field.type === "dropdown" ? (
                    <div className="relative">
                      <select
                        className="w-full p-3 text-sm bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                        value={formData[field.name] || ""}
                        onChange={(e) =>
                          handleInput(field.name, e.target.value)
                        }
                        disabled={
                          !!field.parentField && !formData[field.parentField]
                        }
                        required={field.required}
                      >
                        <option value="" className="text-slate-500">
                          Select {field.label}...
                        </option>
                        {(lookups[field.lookupMaster!] || []).map(
                          (item: any) => {
                            const display =
                              item.country ||
                              item.state ||
                              item.district ||
                              item.option ||
                              item.place ||
                              item.occupation ||
                              item.language ||
                              item.status ||
                              item.leadtype ||
                              item.career_choice ||
                              item.name;
                            const value =
                              item.stateid ||
                              item.districtid ||
                              item.placeid ||
                              item.mastid ||
                              item.leadtypeid ||
                              item.choiceid ||
                              item.occuid ||
                              item.langid ||
                              item.statusid ||
                              item.country_code ||
                              item.id;
                            return (
                              <option key={value} value={value}>
                                {display}
                              </option>
                            );
                          }
                        )}
                      </select>
                      <div className="absolute right-3 top-3.5 pointer-events-none text-slate-500">
                        <ChevronRight size={14} className="rotate-90" />
                      </div>
                    </div>
                  ) : (
                    <input
                      type={field.type}
                      className="w-full p-3 text-sm bg-slate-950 border border-slate-800 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all text-slate-200 placeholder-slate-600 disabled:opacity-50"
                      value={formData[field.name] || ""}
                      onChange={(e) => handleInput(field.name, e.target.value)}
                      maxLength={field.maxLength}
                      required={field.required}
                      placeholder={`Enter ${field.label}...`}
                      disabled={!!editId && field.name === config.pk}
                    />
                  )}
                </div>
              ))}

              <button
                className={`w-full py-3.5 rounded-xl text-white font-bold text-sm tracking-wide flex justify-center items-center gap-2 shadow-lg transition-all active:scale-[0.98] ${
                  editId
                    ? "bg-yellow-600 hover:bg-yellow-500 shadow-yellow-900/20"
                    : "bg-blue-600 hover:bg-blue-500 shadow-blue-900/20"
                }`}
              >
                <Save size={18} /> {editId ? "Update Record" : "Save Record"}
              </button>
            </form>
          </div>
        </div>

        {/* DYNAMIC TABLE (Right Panel) */}
        <div className="lg:col-span-8">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl shadow-black/20 flex flex-col min-h-[600px]">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative w-full sm:w-72 group">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Search records..."
                  className="w-full pl-10 pr-4 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition-all placeholder-slate-600"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">
                  Total:
                </span>
                <span className="bg-blue-900/30 text-blue-300 border border-blue-800/50 text-xs px-2.5 py-1 rounded-md font-mono font-bold">
                  {pagination.total}
                </span>
              </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider w-24">
                      Actions
                    </th>
                    {config.columns.map((col) => (
                      <th
                        key={col.key}
                        className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="p-20 text-center">
                        <Loader2
                          className="animate-spin mx-auto text-blue-500 mb-4"
                          size={32}
                        />
                        <span className="text-slate-500 text-sm">
                          Loading records...
                        </span>
                      </td>
                    </tr>
                  ) : tableData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="p-20 text-center text-slate-500 italic text-sm"
                      >
                        No records found. Add one using the form.
                      </td>
                    </tr>
                  ) : (
                    tableData.map((row, i) => (
                      <tr
                        key={i}
                        className={`group hover:bg-slate-800/50 transition-colors ${
                          editId === row[config.pk]
                            ? "bg-blue-900/10 border-l-2 border-l-blue-500"
                            : "border-l-2 border-l-transparent"
                        }`}
                      >
                        <td className="px-6 py-3.5 flex gap-2">
                          <button
                            onClick={() => handleEdit(row)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-blue-400 hover:bg-blue-900/30 transition-all"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(row)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-900/30 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                        {config.columns.map((col) => (
                          <td
                            key={col.key}
                            className="px-6 py-3.5 text-sm text-slate-300 group-hover:text-white transition-colors"
                          >
                            {row[col.key] || (
                              <span className="text-slate-700">-</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-800 flex justify-end items-center gap-3 bg-slate-900">
              <button
                disabled={pagination.page === 1}
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page - 1 }))
                }
                className="p-2 border border-slate-700 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-400 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-mono text-slate-500">
                Page <span className="text-slate-200">{pagination.page}</span> /{" "}
                {pagination.lastPage}
              </span>
              <button
                disabled={pagination.page >= pagination.lastPage}
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page + 1 }))
                }
                className="p-2 border border-slate-700 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-400 transition-colors"
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
