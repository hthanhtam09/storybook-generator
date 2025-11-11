"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Palette } from "lucide-react";
import { SketchPicker, ColorResult } from "react-color";

interface ColorPickerProps {
  label: string;
  value?: string;
  onChange: (color: string) => void;
}

export function ColorPicker({
  label,
  value = "#3B82F6",
  onChange,
}: ColorPickerProps) {
  const [color, setColor] = useState(value || "#3B82F6");
  const [isOpen, setIsOpen] = useState(false);

  // Update local state when value prop changes
  useEffect(() => {
    if (value !== undefined) {
      setColor(value);
    }
  }, [value]);

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    onChange(newColor);
  };

  const handleSketchColorChange = (colorResult: ColorResult) => {
    const hexColor = colorResult.hex;
    handleColorChange(hexColor);
  };

  const handleHexChange = (hex: string) => {
    // Auto-add # if missing
    let formattedHex = hex;
    if (hex && !hex.startsWith("#")) {
      formattedHex = "#" + hex;
    }

    // Validate hex color
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (
      hexRegex.test(formattedHex) ||
      formattedHex === "" ||
      formattedHex === "#"
    ) {
      setColor(formattedHex);
      if (hexRegex.test(formattedHex)) {
        onChange(formattedHex);
      }
    } else if (hex === "") {
      setColor("");
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal"
          >
            <div
              className="w-4 h-4 rounded mr-2 border border-gray-300"
              style={{ backgroundColor: color }}
            />
            <span className="flex-1">{color.toUpperCase()}</span>
            <Palette className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="space-y-4 p-4">
            {/* Hex Input - Quick Entry */}
            <div className="space-y-2">
              <Label>Hex Color Code</Label>
              <div className="flex items-center gap-2">
                <div
                  className="w-12 h-12 rounded border-2 border-gray-300 flex-shrink-0"
                  style={{ backgroundColor: color || "#ffffff" }}
                />
                <Input
                  type="text"
                  value={color}
                  onChange={(e) => handleHexChange(e.target.value)}
                  placeholder="3B82F6 hoặc #3B82F6"
                  className="flex-1 font-mono text-base"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Nhập mã màu hex (có thể bỏ qua dấu #)
              </p>
            </div>

            {/* Advanced Color Picker */}
            <div className="space-y-2 pt-2 border-t">
              <Label>Color Picker</Label>
              <div className="flex justify-center">
                <SketchPicker
                  color={color}
                  onChange={handleSketchColorChange}
                  disableAlpha={true}
                />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
