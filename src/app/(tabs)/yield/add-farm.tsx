import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useRef, createElement } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert, Platform } from "react-native";
import { ArrowLeft, TreePine, Ruler, MapPin, Building2, Save, AlertCircle, Map as MapIcon, Crosshair, Calendar, Hash, Plus, Minus } from "lucide-react-native";
import { useYieldApp } from "@/store/YieldAppContext";
import { createFarm, updateFarm, getFarm, deleteFarm } from "@/services/yieldFarmDb";
import { generateTreeLayout } from "@/utils/yieldTreeFactory";
import type { Farm } from "@/types/yield";
import * as Location from 'expo-location';
import { YieldLocationPickerMap } from "@/components/yield/YieldLocationPickerMap";
import DateTimePicker from '@react-native-community/datetimepicker';

// Removed Google API Key dependency
interface FarmFormProps {
  onBack: () => void;
  onSaved: (farmId: string) => void;
  farmId?: string;
}

const inputCls = "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 bg-white";

export default function AddFarmScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const farmId = id ? id.toString() : undefined;
  const onBack = () => router.back();
  const onSaved = (savedId?: string) => router.back();
  const { user, refreshFarms } = useYieldApp();
  const [name, setName] = useState("");
  const [totalTrees, setTotalTrees] = useState("");
  const [perches, setPerches] = useState("");
  const [locationName, setLocationName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [lastHarvestDate, setLastHarvestDate] = useState("");
  const [lastHarvestYield, setLastHarvestYield] = useState("");
  const [deviceIds, setDeviceIds] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(!!farmId);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [mapType, setMapType] = useState<any>("hybrid");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const mapRef = useRef<any>(null);

  const [region, setRegion] = useState<any>({
    latitude: 7.8731,
    longitude: 80.7718,
    latitudeDelta: 4,
    longitudeDelta: 4,
  });

  useEffect(() => {
    if (!farmId || !user) return;
    getFarm(user.uid, farmId).then((farm: Farm | null) => {
      if (farm) {
        setName(farm.name);
        setTotalTrees(String(farm.totalTrees));
        setPerches(String(farm.perches));
        setLocationName(farm.locationName);
        setLat(farm.lat ? String(farm.lat) : "");
        setLng(farm.lng ? String(farm.lng) : "");
        setLastHarvestDate(farm.lastHarvestDate || "");
        setLastHarvestYield(farm.lastHarvestYield ? String(farm.lastHarvestYield) : "");
        setDeviceIds(farm.deviceIds ? farm.deviceIds.join(", ") : (farm.deviceId || ""));
        if (farm.lat && farm.lng) {
          setRegion({
            latitude: farm.lat,
            longitude: farm.lng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        }
      }
      setLoadingExisting(false);
    });
  }, [farmId, user]);

  const reverseGeocode = async (latitude: number, longitude: number) => {
    setIsGeocoding(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
        { headers: { 'User-Agent': 'SaruPolApp/1.0 (Contact: admin@sarupol.lk)' } }
      );
      const data = await response.json();
      
      if (data.error) {
        console.warn("Reverse geocoding API error:", data.error);
        return;
      }

      if (data.display_name) {
        let locName = data.display_name;
        if (data.address) {
          const { suburb, city, town, village, county } = data.address;
          const local = suburb || village || town;
          const region = city || county;
          if (local && region) {
            locName = `${local}, ${region}`;
          } else if (local || region) {
            locName = local || region;
          }
        }
        setLocationName(locName);
      }
    } catch (e) {
      console.warn("Reverse geocoding failed", e);
    } finally {
      setIsGeocoding(false);
    }
  };

  const forwardGeocode = async (address: string) => {
    if (!address.trim()) return;
    setIsGeocoding(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`,
        { headers: { 'User-Agent': 'SaruPolApp/1.0 (Contact: admin@sarupol.lk)' } }
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        setLat(String(lat));
        setLng(String(lng));
        
        const newRegion = {
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion?.(newRegion, 1000);
      } else {
        console.warn("Forward geocoding returned no results for:", address);
      }
    } catch (e) {
      console.warn("Forward geocoding failed", e);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleMapPress = (e: any) => {
    console.log("Map pressed! Event:", e);
    const { latitude, longitude } = e.nativeEvent.coordinate;
    console.log(`Extracted coords: ${latitude}, ${longitude}`);
    setLat(String(latitude));
    setLng(String(longitude));
    reverseGeocode(latitude, longitude);
  };

  const handleGetCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied');
        return;
      }

      setIsGeocoding(true);
      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      setLat(String(latitude));
      setLng(String(longitude));
      
      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
      
      await reverseGeocode(latitude, longitude);
    } catch (e) {
      Alert.alert('Error', 'Failed to get current location');
      setIsGeocoding(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) return setError("Farm name is required.");
    const tc = parseInt(totalTrees, 10);
    if (!tc || tc <= 0) return setError("Enter a valid tree count.");
    if (tc > 400) return setError("For performance, limit to 400 trees or fewer.");
    const p = parseFloat(perches);
    if (!p || p <= 0) return setError("Enter a valid land size in perches.");
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) return setError("Enter valid latitude and longitude coordinates.");
    if (!deviceIds.trim()) return setError("Hardware Device ID is required.");

    setError(null);
    setSaving(true);
    try {
      const parsedDeviceIds = deviceIds.split(",").map(id => id.trim()).filter(id => id.length > 0);
      const fallbackDeviceId = `D${String(Math.floor(1000 + Math.random() * 8999))}`;
      const finalDeviceIds = parsedDeviceIds.length > 0 ? parsedDeviceIds : [fallbackDeviceId];
      const primaryDeviceId = finalDeviceIds[0];

      if (farmId) {
        await updateFarm(user.uid, farmId, {
          name: name.trim(),
          totalTrees: tc,
          perches: p,
          locationName: locationName.trim(),
          lat: latNum,
          lng: lngNum,
          lastHarvestDate: lastHarvestDate.trim() || undefined,
          lastHarvestYield: lastHarvestYield ? parseInt(lastHarvestYield, 10) : undefined,
          deviceId: primaryDeviceId,
          deviceIds: finalDeviceIds,
        });
        await refreshFarms();
        onSaved(farmId);
      } else {
        const layout = generateTreeLayout(p, tc);
        const id = await createFarm(user.uid, {
          name: name.trim(),
          totalTrees: tc,
          perches: p,
          locationName: locationName.trim(),
          lat: latNum,
          lng: lngNum,
          lastHarvestDate: lastHarvestDate.trim() || undefined,
          lastHarvestYield: lastHarvestYield ? parseInt(lastHarvestYield, 10) : undefined,
          deviceId: primaryDeviceId,
          deviceIds: finalDeviceIds,
          treeLayout: layout,
        });
        await refreshFarms();
        onSaved(id);
      }
    } catch (e: any) {
      setError(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Farm",
      "Are you sure you want to delete this farm? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!user || !farmId) return;
            setSaving(true);
            try {
              await deleteFarm(user.uid, farmId);
              await refreshFarms();
              router.back();
            } catch (e: any) {
              Alert.alert("Error", `Failed to delete farm: ${e.message}`);
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  if (loadingExisting) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#1e7550" />
      </View>
    );
  }

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  const hasValidCoordinates = !isNaN(parsedLat) && !isNaN(parsedLng);

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-white px-3 pt-4 pb-3.5 shadow-sm flex-row items-center gap-2">
        <TouchableOpacity onPress={onBack} className="w-9 h-9 rounded-full items-center justify-center">
          <ArrowLeft size={20} color="#475569" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-800">{farmId ? "Edit Farm" : "Add New Farm"}</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ gap: 16, paddingBottom: 96 }}>
        <View className="bg-white rounded-2xl p-5 border border-slate-100">
          <View className="gap-4">
            <Field label="Farm Name" icon={<Building2 size={14} color="#1e7550" />}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Kurunegala Estate"
                placeholderTextColor="#cbd5e1"
                className={inputCls}
              />
            </Field>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Field label="Total Trees" icon={<TreePine size={14} color="#1e7550" />}>
                  <TextInput
                    value={totalTrees}
                    onChangeText={setTotalTrees}
                    placeholder="48"
                    placeholderTextColor="#cbd5e1"
                    keyboardType="numeric"
                    className={inputCls}
                  />
                </Field>
              </View>
              <View className="flex-1">
                <Field label="Perches" icon={<Ruler size={14} color="#1e7550" />}>
                  <TextInput
                    value={perches}
                    onChangeText={setPerches}
                    placeholder="20"
                    placeholderTextColor="#cbd5e1"
                    keyboardType="numeric"
                    className={inputCls}
                  />
                </Field>
              </View>
            </View>

            <Field label="Location Name" icon={<MapPin size={14} color="#1e7550" />}>
              <TextInput
                value={locationName}
                onChangeText={setLocationName}
                onBlur={() => forwardGeocode(locationName)}
                placeholder="e.g. Kurunegala"
                placeholderTextColor="#cbd5e1"
                className={inputCls}
              />
            </Field>
          </View>
        </View>

        {/* Map Picker */}
        <View className="bg-white rounded-2xl p-5 border border-slate-100">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <MapIcon size={16} color="#1e7550" />
              <Text className="text-sm font-bold text-slate-800">Pick Farm Location</Text>
            </View>
            <TouchableOpacity onPress={handleGetCurrentLocation} className="flex-row items-center gap-1 bg-green-50 px-2 py-1.5 rounded-lg border border-green-100">
              <Crosshair size={14} color="#1e7550" />
              <Text className="text-xs font-semibold text-forest-700">Use My GPS</Text>
            </TouchableOpacity>
          </View>

          <YieldLocationPickerMap
            ref={mapRef}
            region={region}
            mapType={mapType}
            parsedLat={parsedLat}
            parsedLng={parsedLng}
            hasValidCoordinates={hasValidCoordinates}
            isGeocoding={isGeocoding}
            onMapPress={handleMapPress}
            onMapTypeToggle={() => setMapType((prev: any) => prev === "hybrid" ? "standard" : "hybrid")}
          />
          
          <Text className="text-[10px] text-slate-500 text-center mb-1">
            Tap or drag the marker on the map to auto-fill coordinates.
          </Text>
        </View>

        {/* coordinate input */}
        <View className="bg-white rounded-2xl p-5 border border-slate-100">
          <View className="flex-row items-center gap-2 mb-1">
            <MapPin size={16} color="#1e7550" />
            <Text className="text-sm font-bold text-slate-800">Farm Coordinates</Text>
          </View>
          <Text className="text-xs text-slate-400 mb-3">
            Enter latitude and longitude for accurate local weather data.
          </Text>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-[10px] text-slate-400 uppercase mb-1">Latitude</Text>
              <TextInput
                value={lat}
                onChangeText={setLat}
                placeholder="e.g. 7.8731"
                placeholderTextColor="#cbd5e1"
                keyboardType="decimal-pad"
                className={inputCls}
              />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] text-slate-400 uppercase mb-1">Longitude</Text>
              <TextInput
                value={lng}
                onChangeText={setLng}
                placeholder="e.g. 80.7718"
                placeholderTextColor="#cbd5e1"
                keyboardType="decimal-pad"
                className={inputCls}
              />
            </View>
          </View>
        </View>

        <View className="bg-white rounded-2xl p-5 border border-slate-100">
          <View className="gap-4">
            <View>
              <Field label="Last Harvest Date" icon={<Calendar size={14} color="#1e7550" />}>
                <View>
                  <View className="flex-row gap-2 mb-2">
                    <TouchableOpacity onPress={() => setLastHarvestDate(new Date().toISOString().slice(0,10))} className="bg-slate-100 px-3 py-1.5 rounded-lg">
                      <Text className="text-xs font-semibold text-slate-700">Today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                      const d = new Date(); d.setDate(d.getDate() - 14);
                      setLastHarvestDate(d.toISOString().slice(0,10));
                    }} className="bg-slate-100 px-3 py-1.5 rounded-lg">
                      <Text className="text-xs font-semibold text-slate-700">2 Weeks Ago</Text>
                    </TouchableOpacity>
                  </View>
                  {Platform.OS === 'web' ? (
                    createElement('input', {
                      type: 'date',
                      value: lastHarvestDate,
                      onChange: (e: any) => setLastHarvestDate(e.target.value),
                      style: { padding: '10px 14px', borderRadius: 12, border: '1px solid #e2e8f0', width: '100%', outline: 'none', color: '#1e293b', backgroundColor: '#fff', fontSize: 14 }
                    })
                  ) : (
                    <>
                      <TouchableOpacity 
                        onPress={() => setShowDatePicker(true)}
                        className={inputCls}
                        style={{ justifyContent: 'center' }}
                      >
                        <Text style={{ color: lastHarvestDate ? '#1e293b' : '#cbd5e1' }}>
                          {lastHarvestDate || "YYYY-MM-DD"}
                        </Text>
                      </TouchableOpacity>
                      {showDatePicker && (
                        <DateTimePicker
                          value={lastHarvestDate ? new Date(lastHarvestDate) : new Date()}
                          mode="date"
                          display="default"
                          onChange={(event: any, selectedDate?: Date) => {
                            setShowDatePicker(false);
                            if (selectedDate) {
                              setLastHarvestDate(selectedDate.toISOString().slice(0,10));
                            }
                          }}
                        />
                      )}
                    </>
                  )}
                </View>
              </Field>
            </View>

            <View>
              <Field label="Last Harvest Yield" icon={<Hash size={14} color="#1e7550" />}>
                <View>
                  <View className="flex-row gap-2 mb-2">
                    {[250, 500, 750, 1000].map(val => (
                      <TouchableOpacity key={val} onPress={() => setLastHarvestYield(String(val))} className="bg-slate-100 px-2 py-1.5 rounded-lg">
                        <Text className="text-[11px] font-semibold text-slate-700">{val}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity 
                      onPress={() => setLastHarvestYield(String(Math.max(0, (parseInt(lastHarvestYield || "0", 10) - 1))))}
                      className="bg-slate-100 w-10 h-10 rounded-xl items-center justify-center border border-slate-200">
                      <Minus size={16} color="#64748b" />
                    </TouchableOpacity>
                    
                    <TextInput
                      value={lastHarvestYield}
                      onChangeText={setLastHarvestYield}
                      placeholder="e.g. 1200"
                      placeholderTextColor="#cbd5e1"
                      keyboardType="numeric"
                      className={`${inputCls} flex-1 text-center`}
                    />

                    <TouchableOpacity 
                      onPress={() => setLastHarvestYield(String((parseInt(lastHarvestYield || "0", 10) + 1)))}
                      className="bg-slate-100 w-10 h-10 rounded-xl items-center justify-center border border-slate-200">
                      <Plus size={16} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                </View>
              </Field>
            </View>
          </View>
        </View>

        <View className="bg-white rounded-2xl p-5 border border-slate-100">
          <Field label="Hardware Device ID(s) *" icon={<Building2 size={14} color="#1e7550" />}>
            <Text className="text-[10px] text-slate-400 mb-2">Enter your IoT device IDs separated by commas (e.g. D8100, D8101)</Text>
            <TextInput
              value={deviceIds}
              onChangeText={setDeviceIds}
              placeholder="e.g. D8100, D8101"
              placeholderTextColor="#cbd5e1"
              className={inputCls}
            />
          </Field>
        </View>

        {error && (
          <View className="flex-row items-start gap-1.5 bg-red-50 rounded-lg px-3 py-2">
            <AlertCircle size={16} color="#dc2626" />
            <Text className="text-sm text-red-600 flex-1">{error}</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="flex-row items-center justify-center gap-2 bg-forest-600 py-3.5 rounded-xl"
          style={saving ? { opacity: 0.6 } : undefined}
        >
          {saving ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text className="text-white font-semibold text-sm">Saving…</Text>
            </>
          ) : (
            <>
              <Save size={18} color="#fff" />
              <Text className="text-white font-semibold text-sm">{farmId ? "Update Farm" : "Create Farm"}</Text>
            </>
          )}
        </TouchableOpacity>

        {farmId && (
          <TouchableOpacity
            onPress={handleDelete}
            disabled={saving}
            className="flex-row items-center justify-center gap-2 bg-red-50 border border-red-200 py-3.5 rounded-xl mt-2 mb-6"
            style={saving ? { opacity: 0.6 } : undefined}
          >
            <Text className="text-red-600 font-semibold text-sm">Delete Farm</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <View>
      <View className="flex-row items-center gap-2 mb-1.5">
        {icon}
        <Text className="text-xs font-medium text-slate-600">{label}</Text>
      </View>
      {children}
    </View>
  );
}
