import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical, Plus, Trash2, ChevronDown, ChevronUp, Settings2, Type, Mail, Calendar, AlignLeft, List, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type FormFieldType = 'text' | 'textarea' | 'select' | 'checkbox' | 'date' | 'email';

interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  order: number;
  isCore?: boolean;
}

interface FormConfig {
  fields: FormField[];
  submitButtonText: string;
  successMessage: string;
}

const FIELD_TYPE_ICONS: Record<FormFieldType, React.ReactNode> = {
  text: <Type className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  date: <Calendar className="w-4 h-4" />,
  textarea: <AlignLeft className="w-4 h-4" />,
  select: <List className="w-4 h-4" />,
  checkbox: <List className="w-4 h-4" />,
};

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'Text',
  email: 'Email',
  date: 'Date',
  textarea: 'Long Text',
  select: 'Dropdown',
  checkbox: 'Checkboxes',
};

interface FormDesignerProps {
  artistId: string;
  token?: string;
}

export function FormDesigner({ artistId, token }: FormDesignerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [draggedField, setDraggedField] = useState<string | null>(null);

  const { data: configData, isLoading } = useQuery<{ config: FormConfig }>({
    queryKey: ["/api/artist-form-config", artistId],
    queryFn: async () => {
      const url = token 
        ? `/api/artist-form-config/${artistId}?token=${token}`
        : `/api/artist-form-config/${artistId}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to load form config");
      return res.json();
    },
  });

  const updateConfig = useMutation({
    mutationFn: async (config: FormConfig) => {
      const url = token 
        ? `/api/artist-form-config/${artistId}?token=${token}`
        : `/api/artist-form-config/${artistId}`;
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ config }),
      });
      if (!res.ok) throw new Error("Failed to save form config");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artist-form-config", artistId] });
      toast({ title: "Form saved", description: "Your inquiry form has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save form.", variant: "destructive" });
    },
  });

  const config = configData?.config;

  if (isLoading || !config) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
      </div>
    );
  }

  const handleFieldUpdate = (fieldId: string, updates: Partial<FormField>) => {
    const updatedFields = config.fields.map(f => 
      f.id === fieldId ? { ...f, ...updates } : f
    );
    updateConfig.mutate({ ...config, fields: updatedFields });
  };

  const handleAddField = () => {
    const newField: FormField = {
      id: `custom_${Date.now()}`,
      type: 'text',
      label: 'New Question',
      placeholder: '',
      required: false,
      order: config.fields.length,
    };
    updateConfig.mutate({ ...config, fields: [...config.fields, newField] });
    setExpandedField(newField.id);
  };

  const handleDeleteField = (fieldId: string) => {
    const updatedFields = config.fields.filter(f => f.id !== fieldId);
    updateConfig.mutate({ ...config, fields: updatedFields });
  };

  const handleMoveField = (fieldId: string, direction: 'up' | 'down') => {
    const index = config.fields.findIndex(f => f.id === fieldId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= config.fields.length) return;

    const updatedFields = [...config.fields];
    [updatedFields[index], updatedFields[newIndex]] = [updatedFields[newIndex], updatedFields[index]];
    
    updatedFields.forEach((f, i) => { f.order = i; });
    
    updateConfig.mutate({ ...config, fields: updatedFields });
  };

  const handleOptionsChange = (fieldId: string, optionsText: string) => {
    const options = optionsText.split('\n').map(o => o.trim()).filter(o => o);
    handleFieldUpdate(fieldId, { options });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {config.fields.map((field, index) => (
            <motion.div
              key={field.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="border border-gray-200 rounded-lg bg-white overflow-hidden"
            >
              <div 
                className="flex items-center gap-2 p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedField(expandedField === field.id ? null : field.id)}
                data-testid={`field-row-${field.id}`}
              >
                <div className="text-gray-400">
                  {FIELD_TYPE_ICONS[field.type]}
                </div>
                <span className="flex-1 font-medium text-sm text-gray-800">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </span>
                {field.isCore && (
                  <span title="Core field (required)">
                    <Lock className="w-3 h-3 text-gray-400" />
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMoveField(field.id, 'up'); }}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    data-testid={`button-move-up-${field.id}`}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMoveField(field.id, 'down'); }}
                    disabled={index === config.fields.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    data-testid={`button-move-down-${field.id}`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {expandedField === field.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-100"
                  >
                    <div className="p-4 space-y-4 bg-gray-50">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-gray-600">Label</Label>
                          <Input
                            value={field.label}
                            onChange={(e) => handleFieldUpdate(field.id, { label: e.target.value })}
                            className="mt-1"
                            data-testid={`input-label-${field.id}`}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Field Type</Label>
                          <Select
                            value={field.type}
                            onValueChange={(v) => handleFieldUpdate(field.id, { type: v as FormFieldType })}
                            disabled={field.isCore}
                          >
                            <SelectTrigger className="mt-1" data-testid={`select-type-${field.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {(field.type === 'text' || field.type === 'textarea' || field.type === 'email') && (
                        <div>
                          <Label className="text-xs text-gray-600">Placeholder</Label>
                          <Input
                            value={field.placeholder || ''}
                            onChange={(e) => handleFieldUpdate(field.id, { placeholder: e.target.value })}
                            className="mt-1"
                            placeholder="Hint text shown in empty field"
                            data-testid={`input-placeholder-${field.id}`}
                          />
                        </div>
                      )}

                      {(field.type === 'select' || field.type === 'checkbox') && (
                        <div>
                          <Label className="text-xs text-gray-600">Options (one per line)</Label>
                          <textarea
                            value={field.options?.join('\n') || ''}
                            onChange={(e) => handleOptionsChange(field.id, e.target.value)}
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[80px]"
                            placeholder="Option 1&#10;Option 2&#10;Option 3"
                            data-testid={`textarea-options-${field.id}`}
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`required-${field.id}`}
                            checked={field.required}
                            onCheckedChange={(checked) => handleFieldUpdate(field.id, { required: checked })}
                            disabled={field.isCore}
                            data-testid={`switch-required-${field.id}`}
                          />
                          <Label htmlFor={`required-${field.id}`} className="text-sm text-gray-600">
                            Required
                          </Label>
                        </div>

                        {!field.isCore && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteField(field.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`button-delete-${field.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Button
        variant="outline"
        onClick={handleAddField}
        className="w-full border-dashed border-gray-300 text-gray-600 hover:bg-gray-50"
        data-testid="button-add-field"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Custom Question
      </Button>

      <div className="pt-4 border-t border-gray-200 space-y-4">
        <div>
          <Label className="text-sm text-gray-700">Submit Button Text</Label>
          <Input
            value={config.submitButtonText}
            onChange={(e) => updateConfig.mutate({ ...config, submitButtonText: e.target.value })}
            className="mt-1"
            placeholder="Send Inquiry"
            data-testid="input-submit-button-text"
          />
        </div>
        <div>
          <Label className="text-sm text-gray-700">Success Message</Label>
          <textarea
            value={config.successMessage}
            onChange={(e) => updateConfig.mutate({ ...config, successMessage: e.target.value })}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[60px]"
            placeholder="Thank you! Your inquiry has been received."
            data-testid="textarea-success-message"
          />
        </div>
      </div>
    </div>
  );
}
