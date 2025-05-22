package webhook

import (
	"encoding/json"
	"fmt"
	"github.com/tolabs/database/pkg/server"
	admissionv1 "k8s.io/api/admission/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/serializer"
	"net/http"
)

var (
	runtimeScheme = runtime.NewScheme()
	codecs        = serializer.NewCodecFactory(runtimeScheme)
	deserializer  = codecs.UniversalDeserializer()
)

func WebhookFunc(c *server.Config) {
	http.HandleFunc("/webhook", doReqWebhook)

	fmt.Printf("Serve on %s\n", c.Server.TLSListenAddress)

	if err := http.ListenAndServeTLS(c.Server.TLSListenAddress, "certs/tls.crt", "certs/tls.key", nil); err != nil {
		fmt.Println(err)
		return
	}
}

// webhook钩子
func doReqWebhook(rw http.ResponseWriter, req *http.Request) {
	// 解析 AdmissionReview 请求
	var admissionReviewReq admissionv1.AdmissionReview
	if err := json.NewDecoder(req.Body).Decode(&admissionReviewReq); err != nil {
		http.Error(rw, fmt.Sprintf("Error decoding request: %v", err), http.StatusBadRequest)
		return
	}

	// 获取 Service 对象
	var service corev1.Service
	if _, _, err := deserializer.Decode(admissionReviewReq.Request.Object.Raw, nil, &service); err != nil {
		http.Error(rw, fmt.Sprintf("Error decoding service: %v", err), http.StatusBadRequest)
		return
	}

	// 核心逻辑：仅当 Annotations 包含 monitor.kubeblocks.io/scrape=true 时执行同步
	annotations := service.GetAnnotations()
	if _, ok := annotations["monitor.kubeblocks.io/scrape"]; !ok {
		admissionReviewRes := admissionv1.AdmissionReview{
			TypeMeta: metav1.TypeMeta{
				Kind:       "AdmissionReview",
				APIVersion: "admission.k8s.io/v1",
			},
			Response: &admissionv1.AdmissionResponse{
				UID:     admissionReviewReq.Request.UID,
				Allowed: true,
			},
		}

		fmt.Println("不是kubeblocks创建的Service无需处理")

		rw.Header().Set("Content-Type", "application/json")
		json.NewEncoder(rw).Encode(admissionReviewRes)
		return
	}

	// monitor.kubeblocks.io/scrape 存在且等于true
	if annotations["monitor.kubeblocks.io/scrape"] != "true" {
		// 不满足条件，直接返回允许操作，不修改对象
		admissionReviewRes := admissionv1.AdmissionReview{
			TypeMeta: metav1.TypeMeta{
				Kind:       "AdmissionReview",
				APIVersion: "admission.k8s.io/v1",
			},
			Response: &admissionv1.AdmissionResponse{
				UID:     admissionReviewReq.Request.UID,
				Allowed: true,
			},
		}

		fmt.Println("不是kubeblocks创建的Service无需处理")

		rw.Header().Set("Content-Type", "application/json")
		json.NewEncoder(rw).Encode(admissionReviewRes)
		return
	}

	// 是否存在app.kubernetes.io/instance
	if _, ok := service.Spec.Selector["app.kubernetes.io/instance"]; !ok {
		admissionReviewRes := admissionv1.AdmissionReview{
			TypeMeta: metav1.TypeMeta{
				Kind:       "AdmissionReview",
				APIVersion: "admission.k8s.io/v1",
			},
			Response: &admissionv1.AdmissionResponse{
				UID:     admissionReviewReq.Request.UID,
				Allowed: true,
			},
		}

		fmt.Println("不是kubeblocks创建的Service无需处理")

		rw.Header().Set("Content-Type", "application/json")
		json.NewEncoder(rw).Encode(admissionReviewRes)
		return
	}

	fmt.Println("kubeblocks创建的service 需要同步Selector")

	// kubernetes将app.kubernetes.io/instance复制到 metadata.labels
	labels := service.GetLabels()
	labels["app.kubernetes.io/instance"] = service.Spec.Selector["app.kubernetes.io/instance"]
	patch := []map[string]interface{}{
		{
			"op":    "add",
			"path":  "/metadata/labels",
			"value": labels,
		},
	}

	patchBytes, _ := json.Marshal(patch)

	// 构建 AdmissionResponse
	admissionReviewRes := admissionv1.AdmissionReview{
		TypeMeta: metav1.TypeMeta{
			Kind:       "AdmissionReview",
			APIVersion: "admission.k8s.io/v1",
		},
		Response: &admissionv1.AdmissionResponse{
			UID:     admissionReviewReq.Request.UID,
			Allowed: true,
			Patch:   patchBytes,
			PatchType: func() *admissionv1.PatchType {
				pt := admissionv1.PatchTypeJSONPatch
				return &pt
			}(),
		},
	}

	// 返回响应
	rw.Header().Set("Content-Type", "application/json")
	json.NewEncoder(rw).Encode(admissionReviewRes)
}
