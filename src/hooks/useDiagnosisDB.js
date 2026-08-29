
import { useState, useEffect, useCallback } from 'react';
import diagnosisDB from '../services/DiagnosisDB';

export function useDiagnosisDB() {
  const [diagnoses, setDiagnoses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);


  const loadDiagnoses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await diagnosisDB.getAllDiagnoses();
      setDiagnoses(data);
    } catch (err) {
      setError(err.message);
      console.error('Erro ao carregar diagnósticos:', err);
    } finally {
      setLoading(false);
    }
  }, []);


  const loadStats = useCallback(async () => {
    try {
      const data = await diagnosisDB.getStats();
      setStats(data);
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    }
  }, []);


  const saveDiagnosis = useCallback(async (diagnosisData) => {
    setLoading(true);
    setError(null);
    try {
      const saved = await diagnosisDB.saveDiagnosis(diagnosisData);
      await loadDiagnoses();
      await loadStats();
      return saved;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadDiagnoses, loadStats]);


  const updateDiagnosis = useCallback(async (id, updates) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await diagnosisDB.updateDiagnosis(id, updates);
      await loadDiagnoses();
      await loadStats();
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadDiagnoses, loadStats]);


  const deleteDiagnosis = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await diagnosisDB.deleteDiagnosis(id);
      await loadDiagnoses();
      await loadStats();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadDiagnoses, loadStats]);


  const deleteMany = useCallback(async (ids) => {
    setLoading(true);
    setError(null);
    try {
      await diagnosisDB.deleteManyDiagnoses(ids);
      await loadDiagnoses();
      await loadStats();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadDiagnoses, loadStats]);


  const searchByDisease = useCallback(async (disease) => {
    setLoading(true);
    setError(null);
    try {
      const results = await diagnosisDB.getByDisease(disease);
      return results;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);


  const search = useCallback(async (filters) => {
    setLoading(true);
    setError(null);
    try {
      const results = await diagnosisDB.searchDiagnoses(filters);
      return results;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    loadDiagnoses();
    loadStats();
  }, [loadDiagnoses, loadStats]);

  return {
    diagnoses,
    loading,
    error,
    stats,
    saveDiagnosis,
    updateDiagnosis,
    deleteDiagnosis,
    deleteMany,
    searchByDisease,
    search,
    refresh: loadDiagnoses
  };
}