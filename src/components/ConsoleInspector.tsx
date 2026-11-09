import React, { useState, useEffect } from 'react';
import { ApiLogEntry } from '../types';
import { setApiLogListener } from '../services/api';

export const ConsoleInspector: React.FC = () => {
  const [logs, setLogs] = useState<ApiLogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  useEffect(() => {
    setApiLogListener((entry: ApiLogEntry) => {
      setLogs((prev) => [entry, ...prev.slice(0, 99)]);
    });

    return () => {
      setApiLogListener(null);
    };
  }, []);

  const getMethodBadge = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'badge-method-get';
      case 'POST':
        return 'badge-method-post';
      case 'PUT':
        return 'badge-method-put';
      case 'PATCH':
        return 'badge-method-patch';
      case 'DELETE':
        return 'badge-method-delete';
      default:
        return 'badge-secondary';
    }
  };

  const getStatusBadge = (status?: number) => {
    if (!status) return 'badge-status-error';
    if (status >= 200 && status < 300) return 'badge-status-2xx';
    if (status >= 300 && status < 400) return 'badge-status-3xx';
    if (status >= 400 && status < 500) return 'badge-status-4xx';
    return 'badge-status-5xx';
  };

  return (
    <div className={`console-inspector ${isOpen ? 'console-open' : 'console-minimized'}`}>
      <div className="console-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="console-title">
          <span className="console-icon">⚡</span>
          <strong>Console de Comunicação REST (Service Discovery & Ingress)</strong>
          <span className="console-count">{logs.length} requisições</span>
        </div>
        <div className="console-controls" onClick={(e) => e.stopPropagation()}>
          <button
            className="btn-link text-xs"
            onClick={(e) => {
              e.stopPropagation();
              setLogs([]);
              setSelectedLogId(null);
            }}
          >
            Limpar
          </button>
          <button className="btn-icon" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? '▼ Minimizar' : '▲ Expandir'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="console-body">
          <div className="console-log-list">
            {logs.length === 0 ? (
              <div className="console-empty">
                Nenhuma requisição registrada ainda. Interaja com os botões da aplicação para visualizar as chamadas REST em tempo real.
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`console-log-row ${selectedLogId === log.id ? 'log-row-selected' : ''} ${
                    log.isError ? 'log-row-error' : ''
                  }`}
                  onClick={() => setSelectedLogId(selectedLogId === log.id ? null : log.id)}
                >
                  <span className="log-time">{log.timestamp}</span>
                  <span className={`badge-method ${getMethodBadge(log.method)}`}>{log.method}</span>
                  <span className={`badge-status ${getStatusBadge(log.status)}`}>
                    {log.status || 'ERR'}
                  </span>
                  <span className="log-url" title={log.url}>
                    {log.url}
                  </span>
                </div>
              ))
            )}
          </div>

          {selectedLogId && (
            <div className="console-log-details">
              {(() => {
                const log = logs.find((l) => l.id === selectedLogId);
                if (!log) return null;
                return (
                  <div>
                    <div className="details-header">
                      <strong>
                        {log.method} {log.url} - {log.status || 'Connection Error'}
                      </strong>
                      <span className="text-muted text-xs">{log.timestamp}</span>
                    </div>

                    {log.requestBody && (
                      <div className="details-section">
                        <span className="details-label">Payload da Requisição:</span>
                        <pre className="code-block">
                          {typeof log.requestBody === 'object'
                            ? JSON.stringify(log.requestBody, null, 2)
                            : log.requestBody}
                        </pre>
                      </div>
                    )}

                    <div className="details-section">
                      <span className="details-label">Corpo da Resposta:</span>
                      <pre className="code-block">
                        {typeof log.responseBody === 'object'
                          ? JSON.stringify(log.responseBody, null, 2)
                          : log.responseBody || '(Sem conteúdo)'}
                      </pre>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
