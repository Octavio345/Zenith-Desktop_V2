
class DiagnosisDatabase {
  constructor() {
    this.dbName = 'FarmDiagnosisDB';
    this.version = 2;
    this.db = null;
  }


  async connect() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Erro ao abrir DB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('Banco de dados conectado!');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;

        console.log(`Atualizando DB da versão ${oldVersion} para ${this.version}`);


        if (!db.objectStoreNames.contains('diagnoses')) {
          const store = db.createObjectStore('diagnoses', {
            keyPath: 'id',
            autoIncrement: true
          });


          store.createIndex('date', 'date', { unique: false });
          store.createIndex('disease', 'disease', { unique: false });
          store.createIndex('confidence', 'confidence', { unique: false });
          store.createIndex('plantType', 'plantType', { unique: false });
          store.createIndex('severity', 'severity', { unique: false });

          console.log('Store "diagnoses" criada com índices');
        }


        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
          console.log('Store "settings" criada');
        }
      };
    });
  }


  async ensureConnection() {
    if (!this.db) {
      await this.connect();
    }
    return this.db;
  }


  async saveDiagnosis(diagnosisData) {
    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['diagnoses'], 'readwrite');
      const store = transaction.objectStore('diagnoses');


      const record = {
        ...diagnosisData,
        date: diagnosisData.date || new Date().toISOString(),
        lastModified: new Date().toISOString()
      };

      const request = store.add(record);

      request.onsuccess = () => {
        console.log('Diagnóstico salvo com ID:', request.result);
        resolve({
          ...record,
          id: request.result
        });
      };

      request.onerror = () => {
        console.error('Erro ao salvar:', request.error);
        reject(request.error);
      };

      transaction.oncomplete = () => {
        console.log('Transação concluída');
      };
    });
  }


  async updateDiagnosis(id, updates) {
    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['diagnoses'], 'readwrite');
      const store = transaction.objectStore('diagnoses');


      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        if (!existing) {
          reject(new Error('Diagnóstico não encontrado'));
          return;
        }

        const updated = {
          ...existing,
          ...updates,
          lastModified: new Date().toISOString()
        };

        const putRequest = store.put(updated);

        putRequest.onsuccess = () => resolve(updated);
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }


  async getAllDiagnoses() {
    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['diagnoses'], 'readonly');
      const store = transaction.objectStore('diagnoses');
      const request = store.getAll();

      request.onsuccess = () => {

        const diagnoses = request.result.sort((a, b) =>
          new Date(b.date) - new Date(a.date)
        );
        resolve(diagnoses);
      };

      request.onerror = () => reject(request.error);
    });
  }


  async getDiagnosisById(id) {
    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['diagnoses'], 'readonly');
      const store = transaction.objectStore('diagnoses');
      const request = store.get(Number(id));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }


  async getByDisease(diseaseName) {
    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['diagnoses'], 'readonly');
      const store = transaction.objectStore('diagnoses');
      const index = store.index('disease');
      const request = index.getAll(diseaseName);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }


  async getByPlantType(plantType) {
    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['diagnoses'], 'readonly');
      const store = transaction.objectStore('diagnoses');
      const index = store.index('plantType');
      const request = index.getAll(plantType);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }


  async getBySeverity(severity) {
    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['diagnoses'], 'readonly');
      const store = transaction.objectStore('diagnoses');
      const index = store.index('severity');
      const request = index.getAll(severity);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }


  async searchDiagnoses(filters = {}) {
    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['diagnoses'], 'readonly');
      const store = transaction.objectStore('diagnoses');
      const request = store.getAll();

      request.onsuccess = () => {
        let results = request.result;


        if (filters.startDate) {
          results = results.filter(d => new Date(d.date) >= new Date(filters.startDate));
        }

        if (filters.endDate) {
          results = results.filter(d => new Date(d.date) <= new Date(filters.endDate));
        }

        if (filters.disease) {
          results = results.filter(d =>
            d.disease?.toLowerCase().includes(filters.disease.toLowerCase())
          );
        }

        if (filters.plantType) {
          results = results.filter(d =>
            d.plantType?.toLowerCase() === filters.plantType.toLowerCase()
          );
        }

        if (filters.minConfidence) {
          results = results.filter(d => d.confidence >= filters.minConfidence);
        }

        if (filters.severity) {
          results = results.filter(d => d.severity === filters.severity);
        }

        resolve(results);
      };

      request.onerror = () => reject(request.error);
    });
  }


  async deleteDiagnosis(id) {
    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['diagnoses'], 'readwrite');
      const store = transaction.objectStore('diagnoses');
      const request = store.delete(Number(id));

      request.onsuccess = () => {
        console.log('Diagnóstico deletado:', id);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }


  async deleteManyDiagnoses(ids) {
    await this.ensureConnection();

    const transaction = this.db.transaction(['diagnoses'], 'readwrite');
    const store = transaction.objectStore('diagnoses');

    return Promise.all(ids.map(id =>
      new Promise((resolve, reject) => {
        const request = store.delete(Number(id));
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    ));
  }


  async clearAllDiagnoses() {
    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['diagnoses'], 'readwrite');
      const store = transaction.objectStore('diagnoses');
      const request = store.clear();

      request.onsuccess = () => {
        console.log('Todos os diagnósticos foram removidos');
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }


  async getStats() {
    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['diagnoses'], 'readonly');
      const store = transaction.objectStore('diagnoses');
      const request = store.getAll();

      request.onsuccess = () => {
        const diagnoses = request.result;

        const stats = {
          total: diagnoses.length,
          byDisease: {},
          byPlantType: {},
          bySeverity: {},
          averageConfidence: 0,
          lastMonth: 0,
          totalImages: diagnoses.filter(d => d.imageData).length
        };

        if (diagnoses.length > 0) {

          diagnoses.forEach(d => {
            if (d.disease) {
              stats.byDisease[d.disease] = (stats.byDisease[d.disease] || 0) + 1;
            }
          });


          diagnoses.forEach(d => {
            if (d.plantType) {
              stats.byPlantType[d.plantType] = (stats.byPlantType[d.plantType] || 0) + 1;
            }
          });


          diagnoses.forEach(d => {
            if (d.severity) {
              stats.bySeverity[d.severity] = (stats.bySeverity[d.severity] || 0) + 1;
            }
          });


          const totalConfidence = diagnoses.reduce((sum, d) => sum + (d.confidence || 0), 0);
          stats.averageConfidence = totalConfidence / diagnoses.length;


          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          stats.lastMonth = diagnoses.filter(d => new Date(d.date) >= oneMonthAgo).length;
        }

        resolve(stats);
      };

      request.onerror = () => reject(request.error);
    });
  }


  async saveSetting(key, value) {
    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      const request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }


  async getSetting(key) {
    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }


  async exportData() {
    const diagnoses = await this.getAllDiagnoses();
    const settings = await this.getAllSettings();

    return {
      version: this.version,
      exportDate: new Date().toISOString(),
      diagnoses,
      settings
    };
  }


  async importData(data) {
    if (data.version > this.version) {
      throw new Error('Versão do backup é mais recente que a do banco atual');
    }

    await this.clearAllDiagnoses();

    for (const diagnosis of data.diagnoses) {
      await this.saveDiagnosis(diagnosis);
    }
  }


  async getAllSettings() {
    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.getAll();

      request.onsuccess = () => {
        const settings = {};
        request.result.forEach(item => {
          settings[item.key] = item.value;
        });
        resolve(settings);
      };

      request.onerror = () => reject(request.error);
    });
  }
}


const diagnosisDB = new DiagnosisDatabase();


diagnosisDB.connect().catch(console.error);

export default diagnosisDB;