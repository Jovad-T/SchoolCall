import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# find useEffect(() => { if (!db) return; ...
# and insert our new useEffect right below it.

sync_effect = """
  useEffect(() => {
    if ((window as any).electron && (window as any).electron.ipcRenderer) {
      (window as any).electron.ipcRenderer.on('timetable-auto-updated', (newData: any) => {
        console.log("[자동 동기화] 압핀 시간표 데이터 수신 완료", newData);
        setClassTimetables(newData);
        setTempClassTimetables(newData);
        try {
          localStorage.setItem('class_timetables_map', JSON.stringify(newData));
        } catch(e) {}
        
        if (db) {
           import("firebase/database").then(({ ref: dbRef, set }) => {
             set(dbRef(db, 'globalData/classTimetables'), JSON.parse(JSON.stringify(newData))).catch(console.error);
           });
        }
      });
    }
  }, [db]);
"""

old_effect = """  useEffect(() => {
    if (!db) return;
    const globalRef = ref(db, 'globalData');"""

content = content.replace(old_effect, sync_effect + "\n" + old_effect)

with open("src/App.tsx", "w") as f:
    f.write(content)
