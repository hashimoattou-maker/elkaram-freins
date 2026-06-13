import toast from "react-hot-toast";

export { toast };

export function useToast() {
  return {
    toast: (props: { title?: string; description?: string; variant?: "default" | "destructive" }) => {
      if (props.variant === "destructive") {
        toast.error(props.description || props.title || "");
      } else {
        toast.success(props.description || props.title || "");
      }
    },
    dismiss: toast.dismiss,
  };
}

export type ToastProps = {
  message: string;
  type?: "success" | "error" | "loading";
};
