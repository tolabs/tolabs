package request

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/tolabs/launchpad/pkg/api"
)

func Request(addr string, params *bytes.Buffer) ([]byte, error) {
	resp, err := http.Post(addr, "application/x-www-form-urlencoded", params)

	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		log.Printf("%v\n", resp)
		return nil, fmt.Errorf("victoria metrics server: %s", resp.Status)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	return body, nil
}

func GetQuery(query *api.VMRequest) (string, error) {
	var result string
	switch query.Type {
	case "cpu":
		result = "round(sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{namespace=~\"$namespace\",pod=~\"$pod.*\",container!=\"\"}) by (pod) / sum(cluster:namespace:pod_cpu:active:kube_pod_container_resource_limits{namespace=~\"$namespace\",pod=~\"$pod.*\"}) by (pod) * 100,0.01)"
	case "memory":
		result = "round(sum(container_memory_working_set_bytes{job=\"kubelet\", metrics_path=\"/metrics/cadvisor\",namespace=~\"$namespace\",pod=~\"$pod.*\",container!=\"\"}) by(pod) / sum(cluster:namespace:pod_memory:active:kube_pod_container_resource_limits{namespace=~\"$namespace\",pod=~\"$pod.*\"}) by (pod) * 100, 0.01)"
	case "average_cpu":
		result = "avg(round(sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{namespace=~\"$namespace\",pod=~\"$pod.*\",container!=\"\"}) by (pod) / sum(cluster:namespace:pod_cpu:active:kube_pod_container_resource_limits{namespace=~\"$namespace\",pod=~\"$pod.*\"}) by (pod) * 100,0.01))"
	case "average_memory":
		result = "avg(round(sum(container_memory_working_set_bytes{job=\"kubelet\", metrics_path=\"/metrics/cadvisor\",namespace=~\"$namespace\",pod=~\"$pod.*\",container!=\"\"}) by(pod) / sum(cluster:namespace:pod_memory:active:kube_pod_container_resource_limits{namespace=~\"$namespace\",pod=~\"$pod.*\"}) by (pod) * 100, 0.01))"
	default:
		log.Println(query.Type)
	}
	podName := getPodName(query.LaunchPadName)
	result = strings.ReplaceAll(strings.ReplaceAll(result, "$namespace", query.NS), "$pod", podName)
	return result, nil
}

func getPodName(str string) string {
	index := strings.LastIndex(str, "-")
	firstPart := str[:index]
	return firstPart
}

func VMNew(query *api.VMRequest) ([]byte, error) {
	result, _ := GetQuery(query)

	formData := url.Values{}
	formData.Set("query", result)
	if query.Range.Start != "" {
		formData.Set("start", query.Range.Start)
		formData.Set("end", query.Range.End)
		formData.Set("step", query.Range.Step)
	} else if query.Range.Time != "" {
		formData.Set("time", query.Range.Time)
	}
	bf := bytes.NewBufferString(formData.Encode())

	vmHost := GetVMServerFromEnv()

	if vmHost == "" {
		return nil, api.ErrNoVMHost
	}

	if len(formData.Get("start")) == 0 {
		return Request(vmHost+"/api/v1/query", bf)
	}
	return Request(vmHost+"/api/v1/query_range", bf)
}

func GetVMServerFromEnv() string {
	return os.Getenv("VM_SERVICE_HOST")
}
