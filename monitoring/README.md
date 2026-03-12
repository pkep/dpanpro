# Monitoring

## Prometheus

Configuration dans `prometheus/prometheus.yml`.
Scrape le endpoint Spring Actuator : `/api/actuator/prometheus` toutes les 10s.

## Grafana

Dashboards pré-provisionnés dans `grafana/provisioning/`.
Accès : http://localhost:3001 (admin / depanpro123)
